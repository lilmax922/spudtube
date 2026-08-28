<script setup lang="ts">
import type { Component } from 'vue'
import type { WatchStatus } from '#server/db/schema/title-status'
import { Bookmark, CircleCheck } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

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
    icon: CircleCheck,
    labelAdd: 'watchStatus.watchedMark',
    labelRemove: 'watchStatus.watchedClear',
  },
]

function onActionClick(action: StatusAction): void {
  if (!props.signedIn) {
    emit('signInRequested')
    return
  }
  if (props.status === action.status)
    emit('clearStatus')
  else
    emit('setStatus', action.status)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-for="action in ACTIONS"
      :key="action.status"
      type="button"
      class="inline-flex h-[38px] items-center gap-1.5 rounded-full border border-input bg-muted px-3 text-button-md text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      :class="status === action.status && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
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
