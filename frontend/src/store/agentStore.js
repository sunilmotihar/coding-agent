import { create } from 'zustand'

const REPO = 'https://github.com/sunilmotihar/coding-agent'

const DEMO_CARDS = [
  {
    id: 'card-1',
    title: 'Elapsed timer on cards',
    description: 'Track start time when a card moves to "working" and show "Completed in Xm Ys" on Done cards. Store startedAt/completedAt timestamps on each card in the Zustand store.',
    repoUrl: REPO,
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-2',
    title: 'Toast notifications for plan & PR ready',
    description: 'Show a subtle pop-up toast (top-right, auto-dismiss after 5s) whenever a card moves to the "review" column. Use a lightweight vanilla approach — no new dependencies.',
    repoUrl: REPO,
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-3',
    title: 'Metrics bar in header',
    description: 'Add a right-aligned metrics strip in the app header showing: tasks completed, average completion time, and PRs opened. Derive all values from the Zustand cards array.',
    repoUrl: REPO,
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-4',
    title: 'Live code preview during EXECUTING phase',
    description: 'In the activity panel, show the actual file content being written by the agent (streamed via WebSocket) during the EXECUTING phase, not just tool call names.',
    repoUrl: REPO,
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-5',
    title: 'Edit card title and description',
    description: 'Allow inline editing of the title and description on backlog cards (similar to the existing repo URL edit). Double-click to edit, Enter/blur to save.',
    repoUrl: REPO,
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-6',
    title: 'Keyboard shortcut to approve plan',
    description: 'In the PlanApproval panel, let the user press Enter to approve the plan without clicking the button. Show a small "Enter ↵" hint next to the Approve button.',
    repoUrl: REPO,
    column: 'backlog',
    sessionId: null,
    prUrl: null,
  },
  {
    id: 'card-7',
    title: 'Reset board button',
    description: 'Add a "Reset board" button in the header that calls the existing reset() action in the Zustand store, returning all cards to their initial backlog state.',
    repoUrl: REPO,
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
