import * as React from "react"

export interface ToastOptions {
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  variant?: 'default' | 'destructive';
}

let toastId = 0;

// Simple toast system - in a real app you'd use a proper toast library like react-hot-toast or sonner
const toastFunction = (options: ToastOptions) => {
  const id = ++toastId;
  const toastElement = document.createElement('div');
  toastElement.id = `toast-${id}`;
  
  const bgColor = options.type === 'error' ? 'bg-red-600' : 
                  options.type === 'success' ? 'bg-green-600' : 
                  options.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600';
  
  toastElement.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 min-w-[300px] max-w-[500px] animate-pulse`;
  toastElement.innerHTML = `
    <div class="flex justify-between items-start">
      <div>
        <div class="font-semibold">${options.title}</div>
        ${options.description ? `<div class="text-sm opacity-90 mt-1">${options.description}</div>` : ''}
      </div>
      <button onclick="document.getElementById('toast-${id}').remove()" class="ml-2 text-white hover:opacity-70">
        ✕
      </button>
    </div>
  `;
  
  document.body.appendChild(toastElement);
  
  // Auto remove after duration
  setTimeout(() => {
    const element = document.getElementById(`toast-${id}`);
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateX(100%)';
      setTimeout(() => element.remove(), 300);
    }
  }, options.duration || 5000);
  
  console.log("Toast:", options);
};

export function useToast() {
  return { toast: toastFunction }
}

export const toast = toastFunction;