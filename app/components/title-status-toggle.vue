<script setup lang="ts">
import type { Component } from 'vue'
import type { WatchStatus } from '#shared/personal-tracking/personal-tracking'
import { Bookmark, Check } from '@lucide/vue'
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
  fillWhenActive: boolean
}

const ACTIONS: StatusAction[] = [
  {
    status: 'WATCHLISTED',
    icon: Bookmark,
    labelAdd: 'watchStatus.watchlistAdd',
    labelRemove: 'watchStatus.watchlistRemove',
    fillWhenActive: true,
  },
  {
    status: 'WATCHED',
    icon: Check,
    labelAdd: 'watchStatus.watchedMark',
    labelRemove: 'watchStatus.watchedClear',
    fillWhenActive: false,
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
      class="inline-flex size-[38px] items-center justify-center rounded-full border border-input bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
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
        :size="18"
        :stroke-width="1.75"
        :fill="action.fillWhenActive && status === action.status ? 'currentColor' : 'none'"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
