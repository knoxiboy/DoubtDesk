/**
 * KEYBOARD SHORTCUTS - INTEGRATION EXAMPLES
 * 
 * This file demonstrates how to use the keyboard shortcuts system
 * in your own components throughout DoubtDesk.
 */

// ============================================================================
// EXAMPLE 1: Using Predefined Shortcuts
// ============================================================================

import { useKeyboardShortcut, COMMON_SHORTCUTS } from "@/hooks/useKeyboardShortcut";
import { ShortcutBadge } from "@/components/ui/ShortcutBadge";

// In any component, import the hook and use it:
function SearchComponent() {
  const [isOpen, setIsOpen] = React.useState(false);

  // Ctrl + K to open search
  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.SEARCH,
    onTrigger: () => setIsOpen(true),
    enabled: true
  });

  return (
    <div>
      <input placeholder="Search..." />
      <button>
        Search
        <ShortcutBadge shortcut="Ctrl + K" compact />
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Custom Keyboard Shortcut
// ============================================================================

function DocumentEditor() {
  // Custom shortcut: Ctrl + S to save
  useKeyboardShortcut({
    key: 's',
    ctrl: true,
    onTrigger: () => saveDocument(),
    enabled: true
  });

  // Custom shortcut: Shift + Alt + F to format
  useKeyboardShortcut({
    key: 'f',
    shift: true,
    alt: true,
    onTrigger: () => formatDocument(),
    enabled: true
  });

  return (
    <div>
      <button>
        Save
        <ShortcutBadge shortcut="Ctrl + S" compact />
      </button>
      <button>
        Format
        <ShortcutBadge shortcut="Shift + Alt + F" compact />
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Conditional Shortcuts (Enable/Disable Based on State)
// ============================================================================

function TaskList() {
  const [tasks, setTasks] = React.useState([]);
  const [selectedTaskId, setSelectedTaskId] = React.useState(null);

  // Only enable delete shortcut if a task is selected
  useKeyboardShortcut({
    key: 'Delete',
    onTrigger: () => {
      if (selectedTaskId) {
        setTasks(tasks.filter(t => t.id !== selectedTaskId));
      }
    },
    enabled: !!selectedTaskId // Only when something is selected
  });

  return (
    <div>
      {tasks.map(task => (
        <div 
          key={task.id}
          onClick={() => setSelectedTaskId(task.id)}
          className={selectedTaskId === task.id ? 'selected' : ''}
        >
          {task.name}
        </div>
      ))}
      <button title="Press Delete to remove selected task">
        Delete Selected
        <ShortcutBadge shortcut="Delete" compact />
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Modal with Multiple Shortcuts
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function FormModal({ isOpen, onClose, onSubmit }: ModalProps) {
  const [isValid, setIsValid] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Esc to close
  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.CLOSE,
    onTrigger: onClose,
    enabled: isOpen
  });

  // Ctrl + Enter to submit (only when form is valid)
  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.SUBMIT,
    onTrigger: () => {
      if (isValid && formRef.current) {
        formRef.current.requestSubmit();
      }
    },
    enabled: isOpen && isValid
  });

  if (!isOpen) return null;

  return (
    <div className="modal">
      <form ref={formRef} onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
        <input onChange={(e) => setIsValid(e.target.value.length > 0)} />
        
        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
            <ShortcutBadge shortcut="Esc" compact />
          </button>
          <button type="submit" disabled={!isValid}>
            Submit
            <ShortcutBadge shortcut="Ctrl + Enter" compact />
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Adding to an Existing Button
// ============================================================================

function MyButton() {
  return (
    <button 
      onClick={handleClick}
      title="Keyboard shortcut: Ctrl + K"
    >
      Open Search
      <ShortcutBadge shortcut="Ctrl + K" compact className="ml-auto" />
    </button>
  );
}

// ============================================================================
// EXAMPLE 6: Batch Shortcuts on a Page
// ============================================================================

function ComplexPage() {
  // Multiple shortcuts on the same page
  
  // Ctrl + K: Search
  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.SEARCH,
    onTrigger: () => openSearch(),
    enabled: true
  });

  // Ctrl + N: New item
  useKeyboardShortcut({
    key: 'n',
    ctrl: true,
    onTrigger: () => createNewItem(),
    enabled: true
  });

  // Ctrl + S: Save
  useKeyboardShortcut({
    key: 's',
    ctrl: true,
    onTrigger: () => savePage(),
    enabled: true
  });

  // Ctrl + /: Help
  useKeyboardShortcut({
    key: '/',
    ctrl: true,
    onTrigger: () => showHelp(),
    enabled: true
  });

  return (
    <div>
      <button>
        Search <ShortcutBadge shortcut="Ctrl + K" compact />
      </button>
      <button>
        New <ShortcutBadge shortcut="Ctrl + N" compact />
      </button>
      <button>
        Save <ShortcutBadge shortcut="Ctrl + S" compact />
      </button>
      <button>
        Help <ShortcutBadge shortcut="Ctrl + /" compact />
      </button>
    </div>
  );
}

// ============================================================================
// COMMON PATTERNS
// ============================================================================

/**
 * PATTERN 1: Form Submission
 * Use Ctrl + Enter to submit forms
 */
function FormExample() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isValid, setIsValid] = React.useState(false);

  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.SUBMIT,
    onTrigger: () => formRef.current?.requestSubmit(),
    enabled: isValid
  });

  return (
    <form ref={formRef} onSubmit={(e) => {
      e.preventDefault();
      // Handle submission
    }}>
      <button type="submit">
        Submit <ShortcutBadge shortcut="Ctrl + Enter" compact />
      </button>
    </form>
  );
}

/**
 * PATTERN 2: Modal Dialog
 * Use Esc to close, Ctrl + Enter to confirm
 */
function DialogExample() {
  const [isOpen, setIsOpen] = React.useState(false);

  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.CLOSE,
    onTrigger: () => setIsOpen(false),
    enabled: isOpen
  });

  if (!isOpen) return null;

  return (
    <dialog open>
      <button onClick={() => setIsOpen(false)}>
        Close <ShortcutBadge shortcut="Esc" compact />
      </button>
    </dialog>
  );
}

/**
 * PATTERN 3: Search Bar
 * Use Ctrl + K to focus search
 */
function SearchBarExample() {
  const inputRef = React.useRef<HTMLInputElement>(null);

  useKeyboardShortcut({
    ...COMMON_SHORTCUTS.SEARCH,
    onTrigger: () => inputRef.current?.focus(),
    enabled: true
  });

  return (
    <input 
      ref={inputRef}
      placeholder="Search..." 
      type="search"
    />
  );
}

// ============================================================================
// KEY POINTS TO REMEMBER
// ============================================================================

/*
1. ALWAYS import from the right places:
   - Hook: import { useKeyboardShortcut, COMMON_SHORTCUTS } from "@/hooks/useKeyboardShortcut"
   - Component: import { ShortcutBadge } from "@/components/ui/ShortcutBadge"

2. SHORTCUTS DON'T WORK in:
   - <input> fields
   - <textarea> elements
   - <select> elements
   - contenteditable divs
   - EXCEPT: Esc key always works!

3. USE the 'enabled' flag to control when shortcuts work:
   useKeyboardShortcut({ key: 's', onTrigger: save, enabled: isEditing })

4. DISPLAY shortcuts with ShortcutBadge:
   <ShortcutBadge shortcut="Ctrl + K" />
   <ShortcutBadge shortcut="Esc" compact />

5. USE FORM.requestSubmit() to submit forms from shortcuts:
   useKeyboardShortcut({ 
     ...COMMON_SHORTCUTS.SUBMIT, 
     onTrigger: () => formRef.current?.requestSubmit() 
   })

6. PREDEFINED shortcuts are:
   - COMMON_SHORTCUTS.SEARCH: Ctrl + K
   - COMMON_SHORTCUTS.SUBMIT: Ctrl + Enter
   - COMMON_SHORTCUTS.CLOSE: Esc
*/
