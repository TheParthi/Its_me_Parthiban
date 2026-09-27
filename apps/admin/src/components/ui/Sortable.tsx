import type { CSSProperties, ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '../../lib/format'

export interface SortableHandleProps {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  setActivatorNodeRef: (el: HTMLElement | null) => void
}

export interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  onReorder: (next: T[], ids: string[]) => void
  renderItem: (item: T, handle: SortableHandleProps, state: { dragging: boolean; index: number }) => ReactNode
  layout?: 'vertical' | 'horizontal' | 'grid'
  disabled?: boolean
  className?: string
}

/**
 * Drag-and-drop list (pointer + keyboard: focus the handle, Space to lift,
 * arrows to move, Space to drop). Calls `onReorder` with the new order.
 */
export function SortableList<T>({ items, getId, onReorder, renderItem, layout = 'vertical', disabled, className }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(getId)
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const next = arrayMove(items, from, to)
    onReorder(next, next.map(getId))
  }
  const strategy = layout === 'horizontal' ? horizontalListSortingStrategy : layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={strategy} disabled={disabled}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem key={getId(item)} id={getId(item)}>
              {(handle, dragging) => renderItem(item, handle, { dragging, index })}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ id, children }: { id: string; children: (h: SortableHandleProps, dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative',
  }
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-90')}>
      {children({ attributes: attributes as unknown as Record<string, unknown>, listeners: listeners as Record<string, unknown> | undefined, setActivatorNodeRef }, isDragging)}
    </div>
  )
}

export function DragHandle({ handle, label = 'Drag to reorder', className }: { handle: SortableHandleProps; label?: string; className?: string }) {
  return (
    <button
      type="button"
      ref={handle.setActivatorNodeRef}
      {...handle.attributes}
      {...handle.listeners}
      aria-label={label}
      className={cn('grid h-7 w-6 shrink-0 cursor-grab touch-none place-items-center rounded text-dim hover:bg-white/5 hover:text-fg active:cursor-grabbing', className)}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  )
}

export { arrayMove }
