import type { ScriptPlatform } from '@/types';

export interface ParsedCommand {
  content: string;
  description?: string;
}

export interface ParsedScript {
  title: string;
  description: string;
  platform: ScriptPlatform;
  commands: ParsedCommand[];
}

/**
 * Detect platform based on file extension
 */
export function detectPlatform(filename: string): ScriptPlatform {
  const ext = filename.toLowerCase().split('.').pop();
  const name = filename.toLowerCase();

  // Windows-specific
  if (ext === 'bat' || ext === 'cmd' || ext === 'ps1') {
    return 'windows';
  }

  // macOS-specific
  if (ext === 'command') {
    return 'macos';
  }

  // Unix/Linux shells (also work on macOS)
  if (['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh'].includes(ext || '')) {
    // zsh is default on macOS, but also on Linux
    if (ext === 'zsh') {
      return 'macos';
    }
    return 'linux';
  }

  // Special filenames
  if (name === 'makefile' || name === 'dockerfile' || name === 'rakefile' ||
    name === 'vagrantfile' || name === 'justfile') {
    return 'linux';
  }

  return 'cross';
}

/**
 * Parse .bat / .cmd / .ps1 (Windows) file content
 */
export function parseBatFile(content: string, filename: string): ParsedScript {
  const lines = content.split(/\r?\n/);
  const commands: ParsedCommand[] = [];
  let description = '';
  const ext = filename.toLowerCase().split('.').pop();

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Batch file comments
    if (ext === 'bat' || ext === 'cmd') {
      if (trimmed.startsWith('REM ') || trimmed.startsWith(':: ')) {
        const comment = trimmed.replace(/^(REM |:: )/, '');
        if (!description) description = comment;
        continue;
      }
      // Skip common batch headers
      if (trimmed.toLowerCase() === '@echo off') continue;
      if (trimmed.toLowerCase() === 'pause') continue;
      if (trimmed.toLowerCase() === 'exit') continue;
      if (trimmed.toLowerCase() === 'exit /b') continue;
      if (trimmed.startsWith(':') && !trimmed.startsWith('::')) continue;
      if (trimmed.toLowerCase().startsWith('goto ')) continue;
    }

    // PowerShell comments
    if (ext === 'ps1') {
      if (trimmed.startsWith('#')) {
        const comment = trimmed.replace(/^#\s*/, '');
        if (!description && comment) description = comment;
        continue;
      }
    }

    commands.push({
      content: line.trimEnd(), // Preserve leading whitespace
      description: undefined,
    });
  }

  const title = filename.replace(/\.(bat|cmd|ps1)$/i, '').replace(/[_-]/g, ' ');

  return {
    title,
    description,
    platform: 'windows',
    commands,
  };
}

/**
 * Parse Unix shell script file content (.sh, .bash, .zsh, .fish, etc.)
 */
export function parseShFile(content: string, filename: string): ParsedScript {
  const lines = content.split(/\r?\n/);
  const commands: ParsedCommand[] = [];
  let description = '';
  const platform = detectPlatform(filename);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip shebang
    if (trimmed.startsWith('#!')) continue;

    // Extract comments as description
    if (trimmed.startsWith('#')) {
      const comment = trimmed.replace(/^#\s*/, '');
      if (!description && comment) description = comment;
      continue;
    }

    // Skip common shell constructs
    if (trimmed === 'set -e' || trimmed === 'set -x') continue;
    if (trimmed.startsWith('export ') && trimmed.includes('=')) continue;

    commands.push({
      content: line.trimEnd(), // Preserve leading whitespace
      description: undefined,
    });
  }

  // Extract title from filename
  const title = filename.replace(/\.(sh|bash|zsh|fish|ksh|csh|tcsh|command)$/i, '').replace(/[_-]/g, ' ');

  return {
    title,
    description,
    platform,
    commands,
  };
}

/**
 * Parse Makefile content
 */
function parseMakefile(content: string, filename: string): ParsedScript {
  const lines = content.split(/\r?\n/);
  const commands: ParsedCommand[] = [];
  let description = '';
  let inTarget = false;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      inTarget = false;
      continue;
    }

    // Comments
    if (line.trim().startsWith('#')) {
      const comment = line.trim().replace(/^#\s*/, '');
      if (!description && comment) description = comment;
      continue;
    }

    // Target line (ends with :)
    if (/^[a-zA-Z_][a-zA-Z0-9_-]*:/.test(line)) {
      inTarget = true;
      continue;
    }

    // Command under target (starts with tab)
    if (inTarget && line.startsWith('\t')) {
      commands.push({
        content: line.trimEnd(), // Preserve tabs
        description: undefined,
      });
    }
  }

  return {
    title: filename,
    description,
    platform: 'linux',
    commands,
  };
}

/**
 * Parse generic script (unknown type)
 */
function parseGenericScript(content: string, filename: string): ParsedScript {
  const lines = content.split(/\r?\n/);
  const commands: ParsedCommand[] = [];
  let description = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Comments
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('REM ')) {
      const comment = trimmed.replace(/^(#|\/\/|REM )\s*/, '');
      if (!description && comment) description = comment;
      continue;
    }

    commands.push({
      content: line.trimEnd(), // Preserve leading whitespace
      description: undefined,
    });
  }

  const title = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') || filename;

  return {
    title,
    description,
    platform: detectPlatform(filename),
    commands,
  };
}

/**
 * Auto-detect file type and parse accordingly
 */
export function parseScriptFile(content: string, filename: string): ParsedScript {
  const ext = filename.toLowerCase().split('.').pop();
  const name = filename.toLowerCase();

  // Windows scripts
  if (ext === 'bat' || ext === 'cmd' || ext === 'ps1') {
    return parseBatFile(content, filename);
  }

  // Unix/macOS shell scripts
  if (['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'command'].includes(ext || '')) {
    return parseShFile(content, filename);
  }

  // Makefile
  if (name === 'makefile' || name === 'justfile') {
    return parseMakefile(content, filename);
  }

  // Default: generic parsing
  return parseGenericScript(content, filename);
}
