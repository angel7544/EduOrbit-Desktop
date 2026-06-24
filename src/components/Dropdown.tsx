import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  width?: number | string;
}

export const Dropdown: React.FC<DropdownProps> = ({ label, options, selected, onSelect, width = '100%' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ width: width as any }} className="relative">
      <p className="text-xs font-semibold mb-1 text-textLight">{label}</p>
      <button 
        className="flex flex-row items-center justify-between px-3 py-2.5 bg-inputBackground border border-border rounded-lg w-full text-left cursor-pointer"
        onClick={() => setVisible(!visible)}
      >
        <span className="text-sm font-medium flex-1 mr-2 text-text truncate">
          {selected}
        </span>
        <ChevronDown size={16} className="text-textLight" />
      </button>

      {visible && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setVisible(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 z-[9999] bg-card border border-border rounded-xl shadow-lg max-h-[50vh] overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-bold text-center text-text m-0">Select {label}</h3>
            </div>
            <div className="flex flex-col">
              {options.map((item) => (
                <button
                  key={item}
                  className={`flex flex-row items-center justify-between p-4 border-b border-border transition-colors text-left cursor-pointer ${selected === item ? 'bg-primary/10' : 'hover:bg-black/5'}`}
                  onClick={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <span className={`text-sm ${selected === item ? 'text-primary font-bold' : 'text-text'}`}>
                    {item}
                  </span>
                  {selected === item && <Check size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
