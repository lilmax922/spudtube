<script setup lang="ts">
import type { Component } from 'vue'
import type { WatchStatus } from '#server/db/schema/title-status'
import { Bookmark, Check } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/use-toast'

interface Props {
  status: WatchStatus | null
  signedIn: boolean
  pending?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  pending: false,
})

const emit = defineEmits<{
  setStatus: [status: WatchStatus]
  clearStatus: []
  signInRequested: []
}>()

const { t } = useI18n()
const { showToast } = useToast()

interface StatusAction {
  status: WatchStatus
  icon: Component
  labelAdd: string
  labelRemove: string
}

const ACTIONS: StatusAction[] = [
  {
    status: 'WATCHLISTED',
    icon: Bookmark,
    labelAdd: 'watchStatus.watchlistAdd',
    labelRemove: 'watchStatus.watchlistRemove',
  },
  {
    status: 'WATCHED',
    icon: Check,
    labelAdd: 'watchStatus.watchedMark',
    labelRemove: 'watchStatus.watchedClear',
  },
]

function toastMessage(next: WatchStatus | null, target: WatchStatus): string {
  if (target === 'WATCHLISTED')
    return next ? t('watchStatus.toast.watchlistAdded') : t('watchStatus.toast.watchlistRemoved')
  return next ? t('watchStatus.toast.watchedAdded') : t('watchStatus.toast.watchedRemoved')
}

function onActionClick(action: StatusAction): void {
  if (!props.signedIn) {
    emit('signInRequested')
    return
  }
  const previous = props.status
  const next: WatchStatus | null = props.status === action.status ? null : action.status
  if (next == null)
    emit('clearStatus')
  else
    emit('setStatus', next)

  const message = toastMessage(next, action.status)
  showToast({
    message,
    actionLabel: t('watchStatus.toast.undo'),
    onAction: () => {
      if (previous == null) {
        emit('clearStatus')
      }
      else {
        emit('setStatus', previous)
      }
    },
  })
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-for="action in ACTIONS"
      :key="action.status"
      type="button"
      class="inline-flex h-[38px] items-center gap-1.5 rounded-full border border-input bg-muted px-3 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      :class="status === action.status
        ? 'text-foreground hover:bg-secondary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'"
      :aria-label="status === action.status ? t(action.labelRemove) : t(action.labelAdd)"
      :aria-pressed="status === action.status"
      :title="status === action.status ? t(action.labelRemove) : t(action.labelAdd)"
      :disabled="pending"
      @click="onActionClick(action)"
    >
      <component
        :is="action.icon"
        :size="16"
        :stroke-width="1.75"
        :fill="status === action.status ? 'currentColor' : 'none'"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
