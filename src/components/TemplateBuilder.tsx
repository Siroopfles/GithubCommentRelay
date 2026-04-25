"use client";

import React, { useState, useEffect } from 'react';

type TemplateBuilderProps = {
  value: string;
  onChange: (value: string) => void;
  variables: { name: string; description: string }[];
};

export default function TemplateBuilder({ value, onChange, variables }: TemplateBuilderProps) {
  const [text, setText] = useState(value);

  // Update local state if external value changes (e.g. form reset)
  useEffect(() => {
    setText(value);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onChange(e.target.value);
  };

  const insertVariable = (varName: string) => {
    const newText = text + (text.endsWith(' ') || text === '' ? '' : ' ') + `{{${varName}}}`;
    setText(newText);
    onChange(newText);
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col md:flex-row">
      <div className="md:w-3/4 flex-1 flex flex-col">
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 p-2 flex gap-2 overflow-x-auto text-sm">
          <span className="text-gray-500 py-1">Quick insert:</span>
          {variables.map(v => (
            <button
              key={v.name}
              type="button"
              onClick={() => insertVariable(v.name)}
              className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 whitespace-nowrap transition-colors"
              title={v.description}
            >
              {"{{" + v.name + "}}"}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={handleTextChange}
          className="w-full flex-1 min-h-[200px] p-4 bg-white dark:bg-gray-900 focus:outline-none focus:ring-0 font-mono text-sm resize-y"
          placeholder="Enter markdown template here..."
        />
      </div>
      <div className="md:w-1/4 bg-gray-50 dark:bg-gray-800 p-4 border-t md:border-t-0 md:border-l border-gray-300 dark:border-gray-700 overflow-y-auto max-h-[300px]">
        <h4 className="font-semibold text-sm mb-3">Available Variables</h4>
        <ul className="space-y-3">
          {variables.map(v => (
            <li key={v.name} className="text-sm">
              <code className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded text-blue-600 select-all cursor-pointer" onClick={() => insertVariable(v.name)}>
                {v.name}
              </code>
              <p className="text-gray-500 text-xs mt-1">{v.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
