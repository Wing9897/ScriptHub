import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useUIStore, useScriptStore } from '@/stores';
import { Script } from '@/types';
import i18n from '@/i18n';

export function useCopyScript() {
    const addToast = useUIStore((state) => state.addToast);
    const recordUsage = useScriptStore((state) => state.recordUsage);

    const copyToClipboard = async (text: string) => {
        try {
            await writeText(text);
            addToast({ type: 'success', message: i18n.t('common.clipboard.success') });
        } catch (err) {
            addToast({ type: 'error', message: i18n.t('common.clipboard.error') });
        }
    };

    const copyScript = (script: Script) => {
        recordUsage(script.id);
        const text = script.commands.map((cmd) => cmd.content).join('\n');
        copyToClipboard(text);
    };

    const copyCommand = (content: string) => {
        copyToClipboard(content);
    };

    return { copyScript, copyCommand, copyToClipboard };
}
