import { ref } from 'vue'
import { toast } from 'vue-sonner'

export interface AppToast {
  id: number | string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function useToast() {
  const toasts = ref<AppToast[]>([])

  function dismiss(id: number | string): void {
    toast.dismiss(id)
  }

  function showToast(options: Omit<AppToast, 'id'> & { duration?: number }): string | number {
    const duration = options.duration ?? 4000
    let toastId: string | number = 0
    const onAction = options.onAction
    toastId = toast(options.message, {
      duration,
      action: options.actionLabel && onAction
        ? {
            label: options.actionLabel,
            onClick: () => {
              onAction()
              toast.dismiss(toastId)
            },
          }
        : undefined,
    })
    return toastId
  }

  return { toasts, showToast, dismiss }
}
