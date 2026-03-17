import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskModal } from '../components/TaskModal';
import type { Task } from '../lib/types';

// Isolate from network-dependent hooks
vi.mock('../hooks/useSessions', () => ({
  useSessions: () => ({
    sessions: [],
    loading: false,
    error: null,
    createSession: vi.fn(),
    updateSession: vi.fn(),
    launchSession: vi.fn(),
  }),
}));

// SessionFiles makes fetch calls — stub it out
vi.mock('../components/SessionFiles', () => ({
  SessionFiles: () => null,
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'TASK-001',
    title: 'Existing task',
    description: 'Some description',
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    links: [],
    notes: [],
    screenshots: [],
    relatedTaskIds: [],
    history: [{ id: 'h1', timestamp: now, fromStatus: null, toStatus: 'in-progress' }],
    ...overrides,
  };
}

function defaultProps(task: Task | null = makeTask()) {
  return {
    task,
    allTasks: task ? [task] : [],
    onSave: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    onChangeStatus: vi.fn(),
    onClose: vi.fn(),
    onOpenTask: vi.fn(),
  };
}

// ---------- create mode ----------

describe('TaskModal — create mode', () => {
  it('renders the create form', () => {
    render(<TaskModal {...defaultProps(null)} />);
    expect(screen.getByRole('heading', { name: 'Create Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
  });

  it('disables Create Task button when title is empty', () => {
    render(<TaskModal {...defaultProps(null)} />);
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeDisabled();
  });

  it('calls onCreate with the entered title', async () => {
    const props = defaultProps(null);
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    await user.type(screen.getByPlaceholderText('Task title'), 'My new task');
    await user.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(props.onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My new task' })
    );
  });

  it('calls onClose when Cancel is clicked', async () => {
    const props = defaultProps(null);
    render(<TaskModal {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalled();
  });
});

// ---------- edit mode — basic ----------

describe('TaskModal — edit mode', () => {
  it('shows the task ID and title in the header', () => {
    render(<TaskModal {...defaultProps()} />);
    expect(screen.getByText('TASK-001')).toBeInTheDocument();
    expect(screen.getByText('Existing task')).toBeInTheDocument();
  });

  it('pre-fills title and description fields', () => {
    render(<TaskModal {...defaultProps()} />);
    expect(screen.getByDisplayValue('Existing task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some description')).toBeInTheDocument();
  });

  it('calls onSave and onClose when Save Changes is clicked', async () => {
    const props = defaultProps();
    render(<TaskModal {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(props.onSave).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('calls onClose when Close is clicked without saving', async () => {
    const props = defaultProps();
    render(<TaskModal {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
  });
});

// ---------- pending status change ----------

describe('TaskModal — status change flow', () => {
  it('does not show the pending UI initially', () => {
    render(<TaskModal {...defaultProps()} />);
    expect(screen.queryByPlaceholderText('Why this change? (optional)')).not.toBeInTheDocument();
  });

  it('shows pending note textarea after selecting a different status', async () => {
    render(<TaskModal {...defaultProps()} />);
    await userEvent.setup().selectOptions(screen.getAllByRole('combobox')[0], 'waiting-on-response');
    expect(screen.getByPlaceholderText('Why this change? (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('calls onChangeStatus with the note when Apply is clicked', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'waiting-on-response');
    await user.type(screen.getByPlaceholderText('Why this change? (optional)'), 'Waiting for review');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onChangeStatus).toHaveBeenCalledWith(
      'TASK-001', 'waiting-on-response', 'Waiting for review'
    );
  });

  it('calls onChangeStatus with no note when Apply is clicked without typing', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'backburnered');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onChangeStatus).toHaveBeenCalledWith('TASK-001', 'backburnered', undefined);
  });

  it('hides the pending UI and reverts the dropdown when Cancel is clicked', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    await user.selectOptions(select, 'backburnered');
    expect(screen.getByPlaceholderText('Why this change? (optional)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Why this change? (optional)')).not.toBeInTheDocument();
    expect(select.value).toBe('in-progress');
    expect(props.onChangeStatus).not.toHaveBeenCalled();
  });

  it('does not show pending UI when dropdown is set back to the current status', async () => {
    const props = defaultProps(makeTask({ status: 'backburnered' }));
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    const select = screen.getAllByRole('combobox')[0];
    // Change away then back
    await user.selectOptions(select, 'in-progress');
    await user.selectOptions(select, 'backburnered');
    expect(screen.queryByPlaceholderText('Why this change? (optional)')).not.toBeInTheDocument();
  });

  it('flushes a pending status when Save Changes is clicked', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'backburnered');
    // Don't click Apply — just hit Save Changes
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(props.onChangeStatus).toHaveBeenCalledWith('TASK-001', 'backburnered', undefined);
    expect(props.onSave).toHaveBeenCalled();
  });
});

// ---------- quick action buttons ----------

describe('TaskModal — Mark Complete / Archive', () => {
  it('calls onSave with completed status and closes', async () => {
    const props = defaultProps();
    render(<TaskModal {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mark Complete' }));
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', completedAt: expect.any(String) })
    );
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onChangeStatus).not.toHaveBeenCalled();
  });

  it('bundles unsaved field edits into the Mark Complete save', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<TaskModal {...props} />);
    const titleInput = screen.getByDisplayValue('Existing task');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');
    await user.click(screen.getByRole('button', { name: 'Mark Complete' }));
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated title', status: 'completed' })
    );
  });

  it('calls onSave with archived status and closes', async () => {
    const props = defaultProps();
    render(<TaskModal {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Archive' }));
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'archived', archivedAt: expect.any(String) })
    );
    expect(props.onClose).toHaveBeenCalled();
  });

  it('adds a history entry when marking complete', async () => {
    const props = defaultProps();
    render(<TaskModal {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mark Complete' }));
    const saved: Task = props.onSave.mock.calls[0][0];
    const lastEntry = saved.history[saved.history.length - 1];
    expect(lastEntry.fromStatus).toBe('in-progress');
    expect(lastEntry.toStatus).toBe('completed');
  });
});
