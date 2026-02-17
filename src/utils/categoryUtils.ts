import type { Category } from '@/types/category';

/**
 * 獲取指定類別的所有子孫類別 ID
 */
export function getDescendantCategoryIds(categories: Category[], parentId: string): string[] {
    const children = categories.filter(c => c.parentId === parentId);
    let ids: string[] = [];
    for (const child of children) {
        ids.push(child.id);
        ids.push(...getDescendantCategoryIds(categories, child.id));
    }
    return ids;
}

/**
 * 獲取指定類別及其所有子孫類別的 ID 集合
 */
export function getCategoryAndDescendantIds(categories: Category[], categoryId: string): Set<string> {
    return new Set([categoryId, ...getDescendantCategoryIds(categories, categoryId)]);
}
