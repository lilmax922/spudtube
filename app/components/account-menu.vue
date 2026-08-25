<script setup lang="ts">
import { LogIn, LogOut } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

export interface AccountMenuUser {
  name: string
  image?: string | null
}

defineProps<{ user: AccountMenuUser | null }>()

const emit = defineEmits<{
  signIn: []
  signOut: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-if="!user"
      type="button"
      class="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      @click="emit('signIn')"
    >
      <LogIn class="size-4" stroke-width="1.75" />
      {{ t('auth.signIn') }}
    </button>
    <template v-else>
      <span class="flex min-w-0 items-center gap-2" :title="user.name">
        <img
          v-if="user.image"
          :src="user.image"
          :alt="user.name"
          class="size-7 shrink-0 rounded-full"
        >
        <span class="hidden truncate text-sm text-muted-foreground sm:inline">
          {{ user.name }}
        </span>
      </span>
      <button
        type="button"
        class="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :aria-label="t('auth.signOut')"
        @click="emit('signOut')"
      >
        <LogOut class="size-4" stroke-width="1.75" />
      </button>
    </template>
  </div>
</template>
