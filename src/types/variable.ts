export interface Variable {
    id: string;
    name: string;
    defaultValue: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface NewVariable {
    name: string;
    defaultValue: string;
    description?: string;
}

// Variable syntax: ${VARIABLE_NAME}
export const VARIABLE_REGEX = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

export function extractVariables(text: string): string[] {
    const matches = text.matchAll(VARIABLE_REGEX);
    const variables = new Set<string>();
    for (const match of matches) {
        variables.add(match[1]);
    }
    return Array.from(variables);
}

export function replaceVariables(
    text: string,
    values: Record<string, string>
): string {
    return text.replace(VARIABLE_REGEX, (match, varName) => {
        return values[varName] ?? match;
    });
}
