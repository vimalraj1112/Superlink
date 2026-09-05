import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  required = false,
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setHighlightedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleToggle = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={clsx('relative', className)}>
      <label className="label">{label} {required && <span className="text-red-500">*</span>}</label>
      <div ref={containerRef} className="relative">
        <div
          className={clsx(
            'input flex items-center justify-between cursor-pointer',
            error && 'border-red-500',
            disabled && 'bg-gray-100 cursor-not-allowed'
          )}
          onClick={handleToggle}
        >
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {value ? (
              <>
                <span className="truncate">{selectedOption?.label || value}</span>
                <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 p-1 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-hidden bg-white border border-gray-300 rounded-md shadow-lg scrollbar-thin">
            <div className="relative p-2 border-b border-gray-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
                placeholder="Search..."
                className="input pl-10"
                autoComplete="off"
              />
            </div>
            <div className="max-h-[calc(60vh-44px)] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  {searchTerm ? 'No matching options' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionClick(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm',
                      index === highlightedIndex ? 'bg-primary-50 text-primary-900' : 'text-gray-900 hover:bg-gray-50',
                      option.value === value && 'font-medium text-primary-600'
                    )}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}