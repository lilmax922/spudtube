<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { signIn } from '@/lib/auth-client'

interface Props {
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

function onSignIn(): void {
  void signIn.social({ provider: 'google' })
}

function onCancel(): void {
  emit('update:open', false)
}

function onOpenChange(value: boolean): void {
  emit('update:open', value)
}
</script>

<template>
  <ResponsiveModal
    :open="open"
    :title="t('auth.requiredTitle')"
    :description="t('auth.requiredDescription')"
    @update:open="onOpenChange"
  >
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" @click="onCancel">
        {{ t('auth.cancel') }}
      </Button>
      <Button @click="onSignIn">
        {{ t('auth.signIn') }}
      </Button>
    </div>
  </ResponsiveModal>
</template>
