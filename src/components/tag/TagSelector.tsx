import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTagStore, useUIStore } from '@/stores';
import { cn } from '@/utils/cn';

interface TagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
    const { t } = useTranslation();
    const tags = useTagStore((state) => state.tags);
    const openTagManager = useUIStore((state) => state.openTagManager);

    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter((id) => id !== tagId));
        } else {
            onChange([...selectedTags, tagId]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                    <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
                            isSelected
                                ? 'text-white'
                                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                        )}
                        style={isSelected ? { backgroundColor: tag.color } : undefined}
                    >
                        {!isSelected && (
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: tag.color }}
                            />
                        )}
                        {tag.name}
                        {isSelected && <X className="w-3 h-3" />}
                    </button>
                );
            })}
            <button
                onClick={openTagManager}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
                <Plus className="w-3.5 h-3.5" />
                {t('tag.manage')}
            </button>
        </div>
    );
}
