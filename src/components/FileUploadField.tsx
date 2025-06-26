import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image } from 'lucide-react';

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  onChange: (file: File | null) => void;
  error?: string;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  accept = "image/*",
  onChange,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (file: File | null) => {
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file);
    } else {
      setFileName('');
      setPreview(null);
      onChange(null);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setFileName('');
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileChange(file);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-white">
        {label}
      </Label>
      
      {preview ? (
        <div className="space-y-3">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-white/20 bg-white/5">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-white/80 text-sm truncate max-w-xs">{fileName}</p>
        </div>
      ) : (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-400/10' 
              : 'border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-full bg-white/10">
              <Image className="h-6 w-6 text-white/60" />
            </div>
            <div className="space-y-1">
              <p className="text-white/80 text-sm font-medium">Drop your image here</p>
              <p className="text-white/60 text-xs">or</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50"
            >
              <Upload className="h-4 w-4" />
              Choose File
            </Button>
            <p className="text-white/50 text-xs">PNG, JPG, GIF up to 50MB</p>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      
      {error && (
        <p className="text-red-400 text-sm flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUploadField;