import React, { useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { UploadedFile } from '../types';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES } from '../constants';
import { Paperclip } from 'lucide-react';

export const FileUploadButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { setUploadedFile, addErrorMessage, clearUploadedFile } = useAgileBloomStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input to allow selecting the same file again if cleared
    if(fileInputRef.current) {
        fileInputRef.current.value = ""; 
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      addErrorMessage(`File is too large. Max size: ${MAX_FILE_SIZE_MB}MB. Your file: ${(file.size / (1024*1024)).toFixed(2)}MB`);
      clearUploadedFile();
      return;
    }

    const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
    const isText = SUPPORTED_TEXT_MIME_TYPES.includes(file.type);

    if (!isImage && !isText) {
      addErrorMessage(`Unsupported file type: ${file.type}. Please upload an image (PNG, JPG, GIF, WebP) or a text file (.txt, .md).`);
      clearUploadedFile();
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      let uploadedFileData: UploadedFile;

      if (isImage) {
        uploadedFileData = {
          name: file.name,
          type: file.type,
          mimeType: file.type, // Use actual file type for images
          size: file.size,
          base64Data: result.split(',')[1], // Get base64 part
        };
      } else { // isText (includes text/plain and text/markdown)
        uploadedFileData = {
          name: file.name,
          type: file.type, // Store actual type e.g. text/markdown
          mimeType: file.type, // Use actual file type for processing text
          size: file.size,
          textContent: result,
        };
      }
      setUploadedFile(uploadedFileData);
    };

    reader.onerror = () => {
      addErrorMessage(`Error reading file: ${reader.error?.message || 'Unknown error'}`);
      clearUploadedFile();
    };

    if (isImage) {
      reader.readAsDataURL(file); // Reads as base64 data URL
    } else { // isText
      reader.readAsText(file); // Reads as plain text
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const acceptedMimeTypesAndExtensions = [
    ...SUPPORTED_IMAGE_MIME_TYPES,
    ...SUPPORTED_TEXT_MIME_TYPES,
    '.txt', // Explicitly add extensions for broader browser compatibility
    '.md'
  ].join(',');

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={acceptedMimeTypesAndExtensions}
      />
      <button
        type="button"
        onClick={triggerFileInput}
        disabled={disabled}
        className="p-3 rounded-lg bg-[#5c6f7e] text-gray-200 hover:bg-[#95aac0] disabled:bg-[#5c6f7e]/50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d]"
        title="Attach file (image, .txt, or .md)"
        aria-label="Attach file"
      >
        <Paperclip size={20} />
      </button>
    </>
  );
};