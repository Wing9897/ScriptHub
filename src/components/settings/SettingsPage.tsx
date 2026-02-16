import { useState, useEffect } from 'react';
import { Download, Trash2, AlertTriangle, MonitorUp, FolderOpen, Palette, Moon, Sun, Loader2, CheckCircle, XCircle, Github } from 'lucide-react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { getVersion } from '@tauri-apps/api/app';
import { Button, ConfirmDialog } from '@/components/ui';
import { useScriptStore, useTagStore, useUIStore, useCategoryStore } from '@/stores';
import { cn } from '@/utils';
import { importUnified, exportUnified, initializeGitHubToken, verifyCurrentToken, setManualToken, syncAllToDatabase, clearAllData, type GitHubTokenStatus } from '@/services';
import { useTranslation } from 'react-i18next';

export function SettingsPage() {
    const { t, i18n } = useTranslation();
    const scripts = useScriptStore((state) => state.scripts);
    const setScripts = useScriptStore((state) => state.setScripts);
    const tags = useTagStore((state) => state.tags);
    const setTags = useTagStore((state) => state.setTags);
    const categories = useCategoryStore((state) => state.categories);
    const setCategories = useCategoryStore((state) => state.setCategories);
    const addToast = useUIStore((state) => state.addToast);

    // UI Store (Theming)
    const theme = useUIStore((state) => state.theme);
    const setTheme = useUIStore((state) => state.setTheme);
    const closeBehavior = useUIStore((state) => state.closeBehavior);
    const setCloseBehavior = useUIStore((state) => state.setCloseBehavior);
    const startMinimized = useUIStore((state) => state.startMinimized);
    const setStartMinimized = useUIStore((state) => state.setStartMinimized);
    const closeSettings = useUIStore((state) => state.closeSettings);

    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [autoStartEnabled, setAutoStartEnabled] = useState(false);
    const [autoStartLoading, setAutoStartLoading] = useState(false);
    const [appVersion, setAppVersion] = useState(t('common.loading'));

    // GitHub 連接狀態
    const [githubStatus, setGithubStatus] = useState<GitHubTokenStatus>({ hasToken: false, source: 'none', isValid: null });
    const [githubChecking, setGithubChecking] = useState(true);
    const [manualToken, setManualTokenInput] = useState('');

    // Confirm dialog states
    const [importConfirm, setImportConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);


    // 獲取應用版本
    useEffect(() => {
        getVersion().then(setAppVersion).catch(() => setAppVersion('unknown'));
    }, []);

    // 初始化 GitHub 連接狀態
    useEffect(() => {
        const checkGitHub = async () => {
            setGithubChecking(true);
            try {
                const status = await initializeGitHubToken();
                setGithubStatus(status);

                // 自動驗證 Token
                if (status.hasToken) {
                    const verified = await verifyCurrentToken();
                    setGithubStatus(verified);
                }
            } catch (e) {
                setGithubStatus({ hasToken: false, source: 'none', isValid: false });
            } finally {
                setGithubChecking(false);
            }
        };
        checkGitHub();
    }, []);

    // 檢查開機自啟狀態
    useEffect(() => {
        isEnabled().then(setAutoStartEnabled).catch(() => setAutoStartEnabled(false));
    }, []);

    const handleAutoStartToggle = async () => {
        try {
            setAutoStartLoading(true);
            if (autoStartEnabled) {
                await disable();
                setAutoStartEnabled(false);
                addToast({ type: 'success', message: t('settings.autoStartDisabled') });
            } else {
                await enable();
                setAutoStartEnabled(true);
                addToast({ type: 'success', message: t('settings.autoStartEnabled') });
            }
        } catch (e) {
            console.error('Autostart toggle failed:', e);
            addToast({ type: 'error', message: t('common.error') });
        } finally {
            setAutoStartLoading(false);
        }
    };

    const handleFolderExport = async () => {
        try {
            setIsExporting(true);
            const success = await exportUnified(categories, scripts, tags, []);
            if (success) {
                addToast({ type: 'success', message: t('settings.exportSuccess') });
            }
        } catch (e) {
            console.error('Unified export failed:', e);
            addToast({ type: 'error', message: t('common.error') });
        } finally {
            setIsExporting(false);
        }
    };

    const handleUnifiedImport = async () => {
        try {
            setIsImporting(true);
            const result = await importUnified();
            if (!result) return;

            const confirmMsg = t('settings.confirmUnifiedImport', {
                categoryCount: result.categories.length,
                scriptCount: result.scripts.length,
                tagCount: result.tags.length,
                varCount: 0
            });

            const capturedResult = result;
            setImportConfirm({
                message: confirmMsg,
                onConfirm: async () => {
                    setImportConfirm(null);
                    setCategories(capturedResult.categories);
                    setScripts(capturedResult.scripts);
                    setTags(capturedResult.tags);
                    await syncAllToDatabase(capturedResult.categories, capturedResult.scripts, capturedResult.tags, []);
                    addToast({ type: 'success', message: t('settings.importSuccess') });
                    closeSettings();
                }
            });
        } catch (e) {
            console.error('Unified import failed:', e);
            addToast({ type: 'error', message: e instanceof Error ? e.message : t('common.error') });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClearAll = () => {
        setClearStep(1);
    };

    const handleClearConfirm = () => {
        if (clearStep === 1) {
            setClearStep(2);
            return;
        }
        setClearStep(0);
        setScripts([]);
        setTags([]);
        setCategories([]);
        clearAllData().catch(console.error);
        addToast({ type: 'success', message: t('settings.clearSuccess') });
        closeSettings();
    };

    return (
        <div className="p-6 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header section handled by TopBar, but we can have sub-headers here */}

            {/* Data Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label={t('settings.stats.scripts')} count={scripts.length} />
                <StatCard label={t('settings.stats.tags')} count={tags.length} />
                <StatCard label={t('settings.stats.categories')} count={categories.length} />
            </div>

            {/* Appearance Settings */}
            <section className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-dark-700">
                    <Palette className="w-5 h-5 text-primary-500" />
                    {t('settings.appearance')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme Mode */}
                    <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('settings.themeMode')}
                        </label>
                        <div className="flex bg-gray-100 dark:bg-dark-900 rounded-lg p-1">
                            {(['light', 'dark', 'system'] as const).map((tMode) => (
                                <button
                                    key={tMode}
                                    onClick={() => setTheme(tMode)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                        theme === tMode
                                            ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    )}
                                >
                                    {tMode === 'light' && <Sun className="w-4 h-4" />}
                                    {tMode === 'dark' && <Moon className="w-4 h-4" />}
                                    {tMode === 'system' && <MonitorUp className="w-4 h-4" />}
                                    {tMode === 'light' ? t('settings.themeLight') : tMode === 'dark' ? t('settings.themeDark') : t('settings.themeSystem')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('settings.language')}
                        </label>
                        <div className="flex bg-gray-100 dark:bg-dark-900 rounded-lg p-1">
                            <button
                                onClick={() => i18n.changeLanguage('zh-HK')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                    i18n.language.startsWith('zh')
                                        ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                            >
                                繁體中文
                            </button>
                            <button
                                onClick={() => i18n.changeLanguage('en-US')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                    i18n.language.startsWith('en')
                                        ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* System Settings */}
            <section className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-dark-700">
                    <MonitorUp className="w-5 h-5 text-primary-500" />
                    {t('settings.system')}
                </h3>

                <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{t('settings.autoStart')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.autoStartDesc')}</p>
                    </div>
                    <button
                        onClick={handleAutoStartToggle}
                        disabled={autoStartLoading}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-colors",
                            autoStartEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600',
                            autoStartLoading && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                autoStartEnabled ? 'translate-x-5' : ''
                            )}
                        />
                    </button>
                </div>

                {/* Start Minimized */}
                <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{t('settings.startMinimized')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.startMinimizedDesc')}</p>
                    </div>
                    <button
                        onClick={() => setStartMinimized(!startMinimized)}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-colors",
                            startMinimized ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600'
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                startMinimized ? 'translate-x-5' : ''
                            )}
                        />
                    </button>
                </div>

                {/* Close Behavior */}
                <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {t('settings.closeBehavior.title', 'Close Behavior')}
                    </label>
                    <div className="flex bg-gray-100 dark:bg-dark-900 rounded-lg p-1">
                        {(['ask', 'minimize', 'quit'] as const).map((behavior) => (
                            <button
                                key={behavior}
                                onClick={() => setCloseBehavior(behavior)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                    closeBehavior === behavior
                                        ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                            >
                                {behavior === 'ask' && t('settings.closeBehavior.ask', 'Ask')}
                                {behavior === 'minimize' && t('settings.closeBehavior.minimize', 'Minimize')}
                                {behavior === 'quit' && t('settings.closeBehavior.quit', 'Quit')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Script Extensions */}
                <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {t('settings.scriptExtensions', 'Script Extensions')}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {t('settings.scriptExtensionsHint', 'File extensions to scan when subscribing to GitHub repositories.')}
                    </p>
                    <ScriptExtensionsInput />
                </div>

                {/* GitHub 連接狀態 */}
                <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">{t('settings.githubStatus')}</p>
                        </div>
                        {githubChecking ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{t('settings.githubChecking')}</span>
                            </div>
                        ) : githubStatus.hasToken && githubStatus.isValid ? (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span>{t('settings.githubConnected')}</span>
                            </div>
                        ) : githubStatus.hasToken && githubStatus.isValid === false ? (
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                <XCircle className="w-4 h-4" />
                                <span>{t('settings.githubTokenInvalid')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{t('settings.githubNotConnected')}</span>
                            </div>
                        )}
                    </div>

                    {/* Token 來源說明 */}
                    {githubStatus.hasToken && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            {t('settings.tokenSource')} {githubStatus.source === 'credential_manager' ? t('settings.tokenSourceGCM') :
                                githubStatus.source === 'env_variable' ? t('settings.tokenSourceEnv') : t('settings.tokenSourceManual')}
                        </p>
                    )}

                    {/* 手動 Token 輸入 (僅當沒有自動偵測到 Token 時顯示) */}
                    {!githubStatus.hasToken && !githubChecking && (
                        <>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                {t('settings.noTokenDetected')} <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">GITHUB_TOKEN</code>
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={manualToken}
                                    onChange={(e) => setManualTokenInput(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxx"
                                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <Button
                                    size="sm"
                                    onClick={async () => {
                                        const token = manualToken.trim() || null;
                                        if (token) {
                                            setManualToken(token);
                                            setGithubStatus({ hasToken: true, source: 'manual', isValid: null });
                                            setGithubChecking(true);
                                            try {
                                                const verified = await verifyCurrentToken();
                                                setGithubStatus(verified);
                                            } finally {
                                                setGithubChecking(false);
                                            }
                                            addToast({ type: 'success', message: t('settings.tokenSaved') });
                                        }
                                    }}
                                >
                                    {t('common.save')}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                <a
                                    href="https://github.com/settings/tokens/new?scopes=public_repo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-500 hover:underline"
                                >
                                    {t('settings.createToken')}
                                </a>
                                {' '}{t('settings.tokenScope')}
                            </p>
                        </>
                    )}
                </div>
            </section>

            {/* Data Management */}
            <section className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-dark-700">
                    <Download className="w-5 h-5 text-primary-500" />
                    {t('settings.data')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export */}
                    <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.export')}</h4>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 h-10">
                            {t('settings.exportDesc')}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleFolderExport}
                                disabled={isExporting || (scripts.length === 0 && categories.length === 0)}
                            >
                                <FolderOpen className="w-4 h-4 mr-2" />
                                {t('settings.export')}
                            </Button>
                        </div>
                    </div>

                    {/* Import */}
                    <div className="p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.import')}</h4>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 h-10">
                            {t('settings.importDesc')}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleUnifiedImport}
                                disabled={isImporting}
                            >
                                <FolderOpen className="w-4 h-4 mr-2" />
                                {t('settings.import')}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            <section className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl">
                    <h3 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('settings.dangerZone')}
                    </h3>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-red-600 dark:text-red-400/80">
                            {t('settings.clearAllDesc')}
                        </p>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleClearAll}
                            disabled={scripts.length === 0 && tags.length === 0 && categories.length === 0}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('settings.clearAll')}
                        </Button>
                    </div>
                </div>
            </section>

            <div className="text-center text-xs text-gray-400 dark:text-gray-600 pt-4 pb-8">
                ScriptHub v{appVersion}
            </div>

            {/* Import confirmation dialog */}
            <ConfirmDialog
                isOpen={!!importConfirm}
                onClose={() => setImportConfirm(null)}
                onConfirm={() => importConfirm?.onConfirm()}
                title={t('settings.import')}
                message={importConfirm?.message || ''}
                confirmText={t('common.confirm')}
                variant="warning"
            />

            {/* Clear all data confirmation dialog (2-step) */}
            <ConfirmDialog
                isOpen={clearStep > 0}
                onClose={() => setClearStep(0)}
                onConfirm={handleClearConfirm}
                title={t('settings.clearAll')}
                message={clearStep === 1 ? t('settings.confirmClear') : t('settings.confirmClearDouble')}
                confirmText={t('common.confirm')}
                variant="danger"
            />
        </div>
    );
}

function StatCard({ label, count }: { label: string; count: number }) {
    return (
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center border border-gray-200 dark:border-dark-700 shadow-sm">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {count}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
    );
}

function ScriptExtensionsInput() {
    const { t } = useTranslation();
    const customScriptExtensions = useUIStore((state) => state.customScriptExtensions);
    const addScriptExtension = useUIStore((state) => state.addScriptExtension);
    const removeScriptExtension = useUIStore((state) => state.removeScriptExtension);
    const resetScriptExtensions = useUIStore((state) => state.resetScriptExtensions);
    const addToast = useUIStore((state) => state.addToast);
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        let ext = inputValue.trim().toLowerCase();
        if (!ext) return;
        if (!ext.startsWith('.')) ext = '.' + ext;
        if (customScriptExtensions.includes(ext)) {
            addToast({ type: 'info', message: t('settings.extensionExists', 'Extension already exists') });
            return;
        }
        addScriptExtension(ext);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {customScriptExtensions.map((ext) => (
                    <span
                        key={ext}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                    >
                        {ext}
                        <button
                            onClick={() => removeScriptExtension(ext)}
                            className="hover:text-red-500 transition-colors"
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder=".py, .rb, .js..."
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button size="sm" onClick={handleAdd}>
                    {t('common.create', 'Add')}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetScriptExtensions}>
                    {t('common.reset', 'Reset')}
                </Button>
            </div>
        </div>
    );
}

