import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomePage.vue')
  },
  {
    path: '/wizard',
    name: 'wizard',
    component: () => import('../views/WizardPage.vue')
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('../views/EditorPage.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
