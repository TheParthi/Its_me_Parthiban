import { useState } from 'react'
import { ImagePlus, Images, X } from 'lucide-react'
import { ImageUploader } from '../../../components/media/ImageUploader'
import { MediaPicker, MediaThumb } from '../../../components/media/MediaPicker'
import { Button, Card, CardHeader, DragHandle, EmptyState, Input, SortableList } from '../../../components/ui'
import type { TabProps } from '../projectModel'

const MAX_SHOTS = 20

export function MediaTab({ value: v, set, errors, disabled }: TabProps) {
  const [picking, setPicking] = useState(false)
  const shots = v.screenshotIds
  const room = MAX_SHOTS - shots.length
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Cover image" description="Used on the project card (with the Image preview style) and for link previews." />
        <div className="max-w-xl">
          <ImageUploader
            value={v.coverId}
            onChange={(mid) => set('coverId', mid)}
            category="PROJECT"
            aspect="16:9"
            aspects={['16:9', 'og', '4:5', '1:1', 'free']}
            previewClassName="aspect-video"
            alt={v.title}
            error={errors.coverId}
            disabled={disabled}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Screenshots"
          description={`Gallery shown in the project detail view. Drag to reorder. ${shots.length}/${MAX_SHOTS}`}
          actions={
            <Button size="sm" onClick={() => setPicking(true)} disabled={disabled || room <= 0} icon={<ImagePlus className="h-3.5 w-3.5" />}>
              Add from library
            </Button>
          }
        />
        {shots.length === 0 ? (
          <EmptyState
            compact
            icon={<Images className="h-5 w-5" />}
            title="No screenshots"
            description="Pick images from the media library (upload new ones there or via the cover uploader)."
          />
        ) : (
          <SortableList
            layout="grid"
            items={shots}
            getId={(x) => x}
            onReorder={(next) => set('screenshotIds', next)}
            disabled={disabled}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            renderItem={(mid, handle, s) => (
              <figure className={`group relative overflow-hidden rounded-lg border bg-white/[0.02] ${s.dragging ? 'border-accent/60 shadow-xl' : 'border-line'}`}>
                <div className="aspect-video">
                  <MediaThumb id={mid} className="h-full w-full" />
                </div>
                <figcaption className="flex items-center justify-between gap-1 border-t border-line px-1.5 py-1">
                  <DragHandle handle={handle} label={`Move screenshot ${s.index + 1}`} />
                  <span className="font-mono text-[10.5px] text-dim">#{s.index + 1}</span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-7 w-7 hover:text-rose-300"
                    aria-label={`Remove screenshot ${s.index + 1}`}
                    onClick={() => set('screenshotIds', shots.filter((x) => x !== mid))}
                    disabled={disabled}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </figcaption>
              </figure>
            )}
          />
        )}
        {errors.screenshotIds && (
          <p className="mt-2 text-xs text-rose-300" role="alert">
            {errors.screenshotIds}
          </p>
        )}
      </Card>

      <Card>
        <Input
          label="Video URL"
          type="url"
          value={v.videoUrl ?? ''}
          onChange={(e) => set('videoUrl', e.target.value)}
          error={errors.videoUrl}
          placeholder="https://youtube.com/watch?v=…"
          hint="Optional demo video link (http/https)."
          disabled={disabled}
        />
      </Card>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        multiple
        type="image"
        title="Add screenshots"
        max={room}
        onPick={(assets) => {
          const add = assets.map((a) => a.id).filter((x) => !shots.includes(x))
          set('screenshotIds', [...shots, ...add].slice(0, MAX_SHOTS))
          setPicking(false)
        }}
      />
    </div>
  )
}
