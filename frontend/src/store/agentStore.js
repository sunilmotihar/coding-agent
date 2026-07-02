import { create } from 'zustand'

const DEMO_CARDS = [
  {
    id: 'card-1',
    title: 'Add /healthz endpoint',
    description: 'Returns {status: ok, version: "1.0"} — used by load balancer health checks',
    repoUrl: 'https://github.com/sunilmotihar/autonomous-agent-demo',
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-2',
    title: 'Add rate limiting to API',
    description: 'Cap at 100 requests/min per IP using a sliding window counter',
    repoUrl: 'https://github.com/sunilmotihar/autonomous-agent-demo',
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-3',
    title: 'Write tests for auth module',
    description: 'Cover login, logout, and token refresh flows with pytest fixtures',
    repoUrl: 'https://github.com/sunilmotihar/autonomous-agent-demo',
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
]

export const useAgentStore = create((set) => ({
  sessionId: null,
  phase: 'IDLE',
  plan: [],
  statusFeed: [],
  diff: null,
  branch: null,
  prUrl: null,
  error: null,
  currentStep: null,
  totalSteps: null,
  currentStepTitle: null,
  cards: DEMO_CARDS,
  activeCardId: null,

  deleteCard: (cardId) => set((state) => ({
    cards: state.cards.filter((c) => c.id !== cardId),
  })),

  addCard: (title, description, repoUrl) => set((state) => ({
    cards: [
      ...state.cards,
      {
        id: `card-${Date.now()}`,
        title,
        description,
        repoUrl,
        column: 'backlog',
        sessionId: null,
        prUrl: null,
      },
    ],
  })),

  updateCardRepo: (cardId, repoUrl) => set((state) => ({
    cards: state.cards.map((c) => (c.id === cardId ? { ...c, repoUrl } : c)),
  })),

  startCard: (cardId, sessionId) => set((state) => ({
    sessionId,
    activeCardId: cardId,
    phase: 'IDLE',
    plan: [],
    statusFeed: [],
    diff: null,
    branch: null,
    prUrl: null,
    error: null,
    currentStep: null,
    totalSteps: null,
    currentStepTitle: null,
    cards: state.cards.map((c) =>
      c.id === cardId ? { ...c, sessionId, column: 'working' } : c
    ),
  })),

  reset: () => set({
    sessionId: null,
    phase: 'IDLE',
    plan: [],
    statusFeed: [],
    diff: null,
    branch: null,
    prUrl: null,
    error: null,
    currentStep: null,
    totalSteps: null,
    currentStepTitle: null,
    activeCardId: null,
    cards: DEMO_CARDS,
  }),

  dispatch: ({ type, payload }) => set((state) => {
    const entry = { id: Date.now() + Math.random(), type, payload, ts: Date.now() }
    const feed = [...state.statusFeed, entry]

    switch (type) {
      case 'phase_change': {
        if (payload.phase === 'EXECUTING') {
          return {
            ...state,
            phase: payload.phase,
            currentStep: payload.current_step ?? state.currentStep,
            totalSteps: payload.total_steps ?? state.totalSteps,
            currentStepTitle: payload.step_title ?? state.currentStepTitle,
            statusFeed: feed,
          }
        }
        if (payload.phase === 'AWAITING_PR_APPROVAL') {
          return {
            ...state,
            phase: payload.phase,
            statusFeed: feed,
            cards: state.cards.map((c) =>
              c.id === state.activeCardId ? { ...c, column: 'review' } : c
            ),
          }
        }
        return { ...state, phase: payload.phase, statusFeed: feed }
      }
      case 'plan_generated':
        return { ...state, plan: payload.steps, statusFeed: feed }
      case 'diff_ready':
        return { ...state, diff: payload.diff, branch: payload.branch, statusFeed: feed }
      case 'phase_change_done':
        return {
          ...state,
          prUrl: payload.pr_url,
          statusFeed: feed,
          cards: state.cards.map((c) =>
            c.id === state.activeCardId
              ? { ...c, column: 'done', prUrl: payload.pr_url }
              : c
          ),
        }
      case 'error':
        return { ...state, error: payload.message, phase: 'ERROR', statusFeed: feed }
      default:
        return { ...state, statusFeed: feed }
    }
  }),
}))
