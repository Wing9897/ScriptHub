const appLogo = '/logo.png';
import gitIcon from '@/assets/icons/category_icon_git.png';
import dockerIcon from '@/assets/icons/category_icon_docker.png';
import pythonIcon from '@/assets/icons/category_icon_python.png';
import nodejsIcon from '@/assets/icons/category_icon_nodejs.png';
import databaseIcon from '@/assets/icons/category_icon_database.png';
import terminalIcon from '@/assets/icons/category_icon_terminal.png';

// 內嵌 SVG 圖標 (使用 data URI)
const svgToDataUri = (svg: string) =>
    `data:image/svg+xml,${encodeURIComponent(svg)}`;

const linuxIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M24 4C17.4 4 12 10.5 12 18c0 4.2 1.5 8 4 10.8L13 38c-.3 1 .2 2 1.2 2.3.3.1.5.1.8.1h18c.8 0 1.5-.5 1.8-1.2l.2-.5-3-9.2c2.5-2.8 4-6.6 4-10.8C36 10.5 30.6 4 24 4z" fill="#FFC107"/><circle cx="20" cy="16" r="2" fill="#263238"/><circle cx="28" cy="16" r="2" fill="#263238"/><path d="M20 24c0 0 2 3 4 3s4-3 4-3" stroke="#263238" stroke-width="1.5" stroke-linecap="round"/></svg>`);

const windowsIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="6" width="17" height="17" rx="2" fill="#0078D4"/><rect x="25" y="6" width="17" height="17" rx="2" fill="#0078D4"/><rect x="6" y="25" width="17" height="17" rx="2" fill="#0078D4"/><rect x="25" y="25" width="17" height="17" rx="2" fill="#0078D4"/></svg>`);

const cloudIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M38 28c0-3.3-2.7-6-6-6-.3 0-.7 0-1 .1C29.7 17.2 25.2 14 20 14c-6.6 0-12 5.4-12 12 0 .3 0 .7.1 1C5.2 28 3 30.7 3 34c0 3.9 3.1 7 7 7h26c4.4 0 8-3.6 8-8 0-3.5-2.3-6.5-6-7z" fill="#42A5F5"/></svg>`);

const kubernetesIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4L6 14v20l18 10 18-10V14L24 4z" fill="#326CE5"/><path d="M24 14l-8 4.5v9L24 32l8-4.5v-9L24 14z" fill="white" opacity="0.9"/><circle cx="24" cy="23" r="3" fill="#326CE5"/></svg>`);

const rustIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#DEA584"/><path d="M24 10a14 14 0 100 28 14 14 0 000-28zm0 4a10 10 0 110 20 10 10 0 010-20z" fill="#000" opacity="0.2"/><text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="14" fill="#000">R</text></svg>`);

const golangIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="10" width="40" height="28" rx="6" fill="#00ADD8"/><text x="24" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="white">Go</text></svg>`);

const javaIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M18 6s-1 6 5 10c4 3 8 5 8 10s-4 8-4 8" stroke="#E76F00" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M14 34s2 2 10 2 10-2 10-2" stroke="#5382A1" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 38s2 3 12 3 12-3 12-3" stroke="#5382A1" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`);

const networkIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="10" r="5" fill="#5C6BC0"/><circle cx="10" cy="34" r="5" fill="#5C6BC0"/><circle cx="38" cy="34" r="5" fill="#5C6BC0"/><line x1="24" y1="15" x2="10" y2="29" stroke="#5C6BC0" stroke-width="2"/><line x1="24" y1="15" x2="38" y2="29" stroke="#5C6BC0" stroke-width="2"/><line x1="10" y1="34" x2="38" y2="34" stroke="#5C6BC0" stroke-width="2"/></svg>`);

const securityIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4L8 12v12c0 10.5 6.8 20.3 16 24 9.2-3.7 16-13.5 16-24V12L24 4z" fill="#43A047"/><path d="M20 24l4 4 8-8" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

const folderIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M6 10h14l4 4h18c1.1 0 2 .9 2 2v22c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V12c0-1.1.9-2 2-2z" fill="#FFA726"/></svg>`);

const codeIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M18 14l-10 10 10 10" stroke="#26A69A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 14l10 10-10 10" stroke="#26A69A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="22" y1="36" x2="26" y2="12" stroke="#26A69A" stroke-width="2.5" stroke-linecap="round"/></svg>`);

const serverIcon = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="12" rx="3" fill="#78909C"/><rect x="8" y="20" width="32" height="12" rx="3" fill="#78909C"/><rect x="8" y="34" width="32" height="12" rx="3" fill="#78909C"/><circle cx="14" cy="12" r="2" fill="#4CAF50"/><circle cx="14" cy="26" r="2" fill="#4CAF50"/><circle cx="14" cy="40" r="2" fill="#4CAF50"/></svg>`);

export const categoryIconMap: Record<string, string> = {
    app_logo: appLogo,
    git: gitIcon,
    docker: dockerIcon,
    python: pythonIcon,
    nodejs: nodejsIcon,
    database: databaseIcon,
    terminal: terminalIcon,
    linux: linuxIcon,
    windows: windowsIcon,
    cloud: cloudIcon,
    kubernetes: kubernetesIcon,
    rust: rustIcon,
    golang: golangIcon,
    java: javaIcon,
    network: networkIcon,
    security: securityIcon,
    folder: folderIcon,
    code: codeIcon,
    server: serverIcon,
};

export const getCategoryIconSrc = (iconId: string, customIcon?: string): string => {
    if (customIcon) {
        return customIcon;
    }
    return categoryIconMap[iconId] || appLogo;
};
