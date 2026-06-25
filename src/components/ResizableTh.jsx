/**
 * ResizableTh — a <th> that supports:
 *   • Drag right edge to resize column width (does not affect row height)
 *   • Drag the header cell itself to reorder columns
 *
 * Props:
 *   col         — { k, l, w }
 *   startResize — from useTableState
 *   drag        — from useTableState
 *   dragOver    — from useTableState
 *   className   — extra classes for the th
 *   onClick     — optional click handler (e.g. for sorting)
 *   children    — header content
 */
export function ResizableTh({ col, startResize, drag, dragOver, className = '', onClick, children }) {
  return (
    <th
      draggable
      onDragStart={(e) => { drag.start(col.k); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={(e) => drag.over(e, col.k)}
      onDragLeave={drag.leave}
      onDrop={() => drag.drop(col.k)}
      onDragEnd={drag.end}
      onClick={onClick}
      style={{ width: col.w, position: 'relative', userSelect: 'none', minWidth: '50px' }}
      className={`${className} ${dragOver === col.k ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}`}
      title="Drag to reorder column"
    >
      {/* cursor-grab makes it clear the column is draggable */}
      <span className="cursor-grab active:cursor-grabbing">{children}</span>

      {/* Resize handle — right edge of the th */}
      <div
        onMouseDown={(e) => startResize(col.k, e)}
        onDragStart={(e) => e.stopPropagation()} /* prevent drag when resizing */
        onClick={(e) => e.stopPropagation()}
        title="Drag to resize column"
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: '8px', cursor: 'col-resize', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        className="group"
      >
        <div
          style={{ width: '2px', height: '60%', borderRadius: '1px' }}
          className="bg-transparent group-hover:bg-indigo-400 dark:group-hover:bg-indigo-500 transition-colors"
        />
      </div>
    </th>
  );
}
