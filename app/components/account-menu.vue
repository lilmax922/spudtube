<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface AccountMenuUser {
  name: string
  image?: string | null
}

const props = defineProps<{ user: AccountMenuUser | null }>()

const emit = defineEmits<{
  signIn: []
  signOut: []
}>()

const { t } = useI18n()

const initials = computed(() => {
  const name = props.user?.name?.trim()
  if (!name)
    return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1)
    return (parts[0]?.[0] ?? '?').toUpperCase()
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
})
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-if="!user"
      type="button"
      class="inline-flex h-10 items-center rounded-full px-3 text-button-md text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      @click="emit('signIn')"
    >
      {{ t('auth.signIn') }}
    </button>
    <DropdownMenu v-else>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          :aria-label="user.name"
        >
          <Avatar class="size-8">
            <AvatarImage v-if="user.image" :src="user.image" :alt="user.name" />
            <AvatarFallback>{{ initials }}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuLabel class="truncate">
          {{ user.name }}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="emit('signOut')">
          {{ t('auth.signOut') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
