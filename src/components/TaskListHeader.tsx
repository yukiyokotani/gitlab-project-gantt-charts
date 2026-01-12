import { useState, useCallback, useRef } from 'react';
import './TaskList.css';

interface TaskListHeaderProps {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  columnWidths: { name: number; from: number; to: number };
  onColumnResize: (column: 'name' | 'from' | 'to', width: number) => void;
}

export function TaskListHeader({
  headerHeight,
  fontFamily,
  fontSize,
  columnWidths,
  onColumnResize,
}: TaskListHeaderProps) {
  const [resizing, setResizing] = useState<'name' | 'from' | 'to' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((column: 'name' | 'from' | 'to', e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(column);
    startX.current = e.clientX;
    startWidth.current = columnWidths[column];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      onColumnResize(column, newWidth);
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, onColumnResize]);

  return (
    <div
      className="task-list-header"
      style={{
        height: headerHeight,
        fontFamily,
        fontSize,
      }}
    >
      <div
        className="task-list-header-cell"
        style={{ width: columnWidths.name }}
      >
        Name
        <div
          className={`resize-handle ${resizing === 'name' ? 'resizing' : ''}`}
          onMouseDown={(e) => handleMouseDown('name', e)}
        />
      </div>
      <div
        className="task-list-header-cell"
        style={{ width: columnWidths.from }}
      >
        From
        <div
          className={`resize-handle ${resizing === 'from' ? 'resizing' : ''}`}
          onMouseDown={(e) => handleMouseDown('from', e)}
        />
      </div>
      <div
        className="task-list-header-cell"
        style={{ width: columnWidths.to }}
      >
        To
        <div
          className={`resize-handle ${resizing === 'to' ? 'resizing' : ''}`}
          onMouseDown={(e) => handleMouseDown('to', e)}
        />
      </div>
    </div>
  );
}
