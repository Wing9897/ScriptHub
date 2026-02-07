import { useUIStore, useScriptStore } from '@/stores';
import { Script } from '@/types';
import { extractVariables } from '@/types/variable';
import i18n from '@/i18n';

export function useCopyScript() {
    const addToast = useUIStore((state) => state.addToast);
    const openVariableInput = useUIStore((state) => state.openVariableInput);
    const recordUsage = useScriptStore((state) => state.recordUsage);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            addToast({ type: 'success', message: i18n.t('common.clipboard.success') });
        } catch (err) {
            addToast({ type: 'error', message: i18n.t('common.clipboard.error') });
        }
    };

    const copyScript = (script: Script, mode: 'multiline' | 'inline') => {
        // Record usage for recent scripts
        recordUsage(script.id);

        const commands = script.commands.map((cmd) => cmd.content);
        const text = mode === 'multiline'
            ? commands.join('\n')
            : commands.join(' && ');

        // Check for variables
        const variables = extractVariables(text);
        if (variables.length > 0) {
            openVariableInput(text, variables);
        } else {
            copyToClipboard(text);
        }
    };

    const copyCommand = (content: string) => {
        const variables = extractVariables(content);
        if (variables.length > 0) {
            openVariableInput(content, variables);
        } else {
            copyToClipboard(content);
        }
    };

    return { copyScript, copyCommand, copyToClipboard };
}

