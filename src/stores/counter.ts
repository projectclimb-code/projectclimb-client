import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }
  fetch('/api/counter/init')
    .then((response) => response.json())
    .then((data) => {
      count.value = data.initialCount
    })
  return { count, doubleCount, increment }
})
