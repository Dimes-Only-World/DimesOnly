import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'textarea';
  maxLength?: number;
  maxWords?: number;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onSave,
  type = 'text',
  maxLength,
  maxWords
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    let finalValue = editValue;
    
    if (maxWords) {
      const words = editValue.trim().split(/\s+/);
      if (words.length > maxWords) {
        finalValue = words.slice(0, maxWords).join(' ');
      }
    }
    
    if (maxLength && finalValue.length > maxLength) {
      finalValue = finalValue.substring(0, maxLength);
    }
    
    onSave(finalValue);
    setEditValue(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-blue-600">{label}:</label>
        {!isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0"
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          {type === 'textarea' ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              maxLength={maxLength}
              rows={3}
              className="text-sm"
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              maxLength={maxLength}
              className="text-sm"
            />
          )}
          
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
          
          {maxLength && (
            <p className="text-xs text-gray-500">
              {editValue.length}/{maxLength} characters
            </p>
          )}
          
          {maxWords && (
            <p className="text-xs text-gray-500">
              {editValue.trim().split(/\s+/).length}/{maxWords} words
            </p>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-700 min-h-[20px]">
          {value || 'Click to add...'}
        </div>
      )}
    </div>
  );
};

export default EditableField;