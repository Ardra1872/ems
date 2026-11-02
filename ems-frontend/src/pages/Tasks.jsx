import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getProjects,
  getEmployees
} from '../services/api';
import Modal from '../components/common/Modal';
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
  CheckCircleIcon
} from '../components/common/Icons';
import './Tasks.css';

export function Tasks() {
  const { user, role, isEmployee } = useAuth();
  const canManageTasks = role === 'admin' || role === 'manager';

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [onlyMyTasks, setOnlyMyTasks] = useState(isEmployee);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Form State
  const initialForm = {
    title: '',
    description: '',
    project_id: '',
    project_name: '',
    assignee_id: '',
    assignee_name: '',
    priority: 'Medium',
    status: 'Pending',
    deadline: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskData, projData, empData] = await Promise.all([
        getTasks(),
        getProjects(),
        getEmployees()
      ]);
      setTasks(taskData);
      setProjects(projData);
      setEmployees(empData);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const defaultProj = projects[0];
    const defaultEmp = employees.find(emp => (
      emp.status === 'Active' &&
      defaultProj?.team_ids?.some(id => Number(id) === Number(emp.id))
    ));
    setFormData({
      ...initialForm,
      project_id: defaultProj ? defaultProj.id : '',
      project_name: defaultProj ? defaultProj.name : '',
      assignee_id: defaultEmp ? defaultEmp.id : '',
      assignee_name: defaultEmp ? defaultEmp.name : '',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      project_id: task.project_id,
      project_name: task.project_name,
      assignee_id: task.assignee_id,
      assignee_name: task.assignee_name,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline || ''
    });
    setIsEditModalOpen(true);
  };

  const getProjectAssignees = projectId => {
    const project = projects.find(item => Number(item.id) === Number(projectId));
    const memberIds = new Set((project?.team_ids || []).map(Number));
    return employees.filter(employee => (
      employee.status === 'Active' && memberIds.has(Number(employee.id))
    ));
  };

  const handleProjectChange = projectId => {
    const selectedProject = projects.find(project => Number(project.id) === Number(projectId));
    const eligibleEmployees = getProjectAssignees(projectId);
    const currentAssignee = eligibleEmployees.find(employee => (
      Number(employee.id) === Number(formData.assignee_id)
    ));
    const nextAssignee = currentAssignee || eligibleEmployees[0];
    setFormData({
      ...formData,
      project_id: Number(projectId),
      project_name: selectedProject?.name || '',
      assignee_id: nextAssignee?.id || '',
      assignee_name: nextAssignee?.name || ''
    });
  };

  const handleAssigneeChange = assigneeId => {
    const assignee = getProjectAssignees(formData.project_id)
      .find(employee => Number(employee.id) === Number(assigneeId));
    setFormData({
      ...formData,
      assignee_id: assignee?.id || '',
      assignee_name: assignee?.name || ''
    });
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    try {
      const proj = projects.find(p => p.id === Number(formData.project_id));
      const emp = employees.find(e => e.id === Number(formData.assignee_id));
      const payload = {
        ...formData,
        project_name: proj ? proj.name : 'General Project',
        assignee_name: emp ? emp.name : 'Assigned Member'
      };
      await createTask(payload);
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error creating task: ' + err.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const proj = projects.find(p => p.id === Number(formData.project_id));
      const emp = employees.find(e => e.id === Number(formData.assignee_id));
      const payload = {
        ...formData,
        project_name: proj ? proj.name : selectedTask.project_name,
        assignee_name: emp ? emp.name : selectedTask.assignee_name
      };
      await updateTask(selectedTask.id, payload);
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error updating task: ' + err.message);
    }
  };

  const handleStatusChange = async (taskId, nextStatus) => {
    try {
      await updateTaskStatus(taskId, nextStatus);
      loadData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Delete task "${title}"?`)) {
      try {
        await deleteTask(id);
        loadData();
      } catch {
        alert('Failed to delete task');
      }
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = projectFilter === 'All' || String(t.project_id) === String(projectFilter);
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    const matchesUser = isEmployee || !onlyMyTasks || Number(t.assignee_id) === Number(user?.id);

    return matchesSearch && matchesProject && matchesPriority && matchesUser;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === 'Pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'In Progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');

  const isOverdue = (dateStr, status) => {
    if (!dateStr || status === 'Completed') return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="tasks-page">
      {/* Metrics Banner */}
      <div className="tasks-metrics-grid">
        <div className="task-metric-box">
          <span className="metric-tag">Total Tasks</span>
          <h3>{filteredTasks.length}</h3>
        </div>
        <div className="task-metric-box orange">
          <span className="metric-tag">Pending Action</span>
          <h3>{pendingTasks.length}</h3>
        </div>
        <div className="task-metric-box blue">
          <span className="metric-tag">In Progress</span>
          <h3>{inProgressTasks.length}</h3>
        </div>
        <div className="task-metric-box green">
          <span className="metric-tag">Completed</span>
          <h3>{completedTasks.length}</h3>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tasks-toolbar">
        <div className="tasks-filter-group">
          <div className="search-input-box">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks, descriptions or assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="emp-select-filter"
          >
            <option value="All">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="emp-select-filter"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {isEmployee ? (
            <span className="my-tasks-checkbox">My Tasks</span>
          ) : (
            <label className="my-tasks-checkbox">
              <input
                type="checkbox"
                checked={onlyMyTasks}
                onChange={(e) => setOnlyMyTasks(e.target.checked)}
              />
              <span>My Tasks Only</span>
            </label>
          )}
        </div>

        <div className="tasks-actions-group">
          <div className="view-toggle-btns">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              Board
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>

          {canManageTasks && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <PlusIcon size={16} />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Board / List */}
      {loading ? (
        <div className="emp-loading-state"><p>Loading tasks & status columns...</p></div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="kanban-columns-container">
          {/* Column: Pending */}
          <div className="kanban-column pending">
            <div className="column-header">
              <div className="col-title-badge">
                <span className="status-dot pending"></span>
                <h4>Pending</h4>
              </div>
              <span className="col-count">{pendingTasks.length}</span>
            </div>

            <div className="kanban-cards-stack">
              {pendingTasks.map(task => (
                <div key={task.id} className="kanban-card">
                  <div className="card-top-tags">
                    <span className="project-badge">{task.project_name}</span>
                    <span className={`priority-tag ${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>

                  <h5 className="task-title">{task.title}</h5>
                  <p className="task-desc">{task.description}</p>

                  <div className="task-deadline-row">
                    <span className={`task-date ${isOverdue(task.deadline, task.status) ? 'overdue' : ''}`}>
                      <CalendarIcon size={13} />
                      {task.deadline || 'No deadline'}
                    </span>
                    {isOverdue(task.deadline, task.status) && (
                      <span className="overdue-tag">Overdue</span>
                    )}
                  </div>

                  <div className="card-assignee-actions">
                    <div className="assignee-cell">
                      <span className="assignee-avatar">
                        {(task.assignee_name || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="assignee-name">{task.assignee_name}</span>
                    </div>

                    <div className="card-quick-actions">
                      <button
                        type="button"
                        className="btn-move-status"
                        onClick={() => handleStatusChange(task.id, 'In Progress')}
                        title="Start Task"
                      >
                        Start →
                      </button>
                      {canManageTasks && <button
                        type="button"
                        className="action-icon-btn edit"
                        onClick={() => handleOpenEdit(task)}
                      >
                        <EditIcon size={13} />
                      </button>}
                      {canManageTasks && task.status !== 'Completed' && <button
                        type="button"
                        className="action-icon-btn delete"
                        onClick={() => handleDelete(task.id, task.title)}
                      >
                        <TrashIcon size={13} />
                      </button>}
                    </div>
                  </div>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="empty-col-notice">No pending tasks</div>
              )}
            </div>
          </div>

          {/* Column: In Progress */}
          <div className="kanban-column in-progress">
            <div className="column-header">
              <div className="col-title-badge">
                <span className="status-dot in-progress"></span>
                <h4>In Progress</h4>
              </div>
              <span className="col-count">{inProgressTasks.length}</span>
            </div>

            <div className="kanban-cards-stack">
              {inProgressTasks.map(task => (
                <div key={task.id} className="kanban-card">
                  <div className="card-top-tags">
                    <span className="project-badge">{task.project_name}</span>
                    <span className={`priority-tag ${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>

                  <h5 className="task-title">{task.title}</h5>
                  <p className="task-desc">{task.description}</p>

                  <div className="task-deadline-row">
                    <span className={`task-date ${isOverdue(task.deadline, task.status) ? 'overdue' : ''}`}>
                      <CalendarIcon size={13} />
                      {task.deadline || 'No deadline'}
                    </span>
                    {isOverdue(task.deadline, task.status) && (
                      <span className="overdue-tag">Overdue</span>
                    )}
                  </div>

                  <div className="card-assignee-actions">
                    <div className="assignee-cell">
                      <span className="assignee-avatar">
                        {(task.assignee_name || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="assignee-name">{task.assignee_name}</span>
                    </div>

                    <div className="card-quick-actions">
                      <button
                        type="button"
                        className="btn-complete-status"
                        onClick={() => handleStatusChange(task.id, 'Completed')}
                        title="Mark Complete"
                      >
                        ✓ Done
                      </button>
                      {canManageTasks && <button
                        type="button"
                        className="action-icon-btn edit"
                        onClick={() => handleOpenEdit(task)}
                      >
                        <EditIcon size={13} />
                      </button>}
                      {canManageTasks && task.status !== 'Completed' && <button
                        type="button"
                        className="action-icon-btn delete"
                        onClick={() => handleDelete(task.id, task.title)}
                      >
                        <TrashIcon size={13} />
                      </button>}
                    </div>
                  </div>
                </div>
              ))}
              {inProgressTasks.length === 0 && (
                <div className="empty-col-notice">No tasks in progress</div>
              )}
            </div>
          </div>

          {/* Column: Completed */}
          <div className="kanban-column completed">
            <div className="column-header">
              <div className="col-title-badge">
                <span className="status-dot completed"></span>
                <h4>Completed</h4>
              </div>
              <span className="col-count">{completedTasks.length}</span>
            </div>

            <div className="kanban-cards-stack">
              {completedTasks.map(task => (
                <div key={task.id} className="kanban-card card-completed">
                  <div className="card-top-tags">
                    <span className="project-badge">{task.project_name}</span>
                    <span className="status-pill completed">Completed</span>
                  </div>

                  <h5 className="task-title completed-text">{task.title}</h5>
                  <p className="task-desc">{task.description}</p>

                  <div className="task-deadline-row">
                    <span className="task-date text-green">
                      <CheckCircleIcon size={13} /> Completed
                    </span>
                  </div>

                  <div className="card-assignee-actions">
                    <div className="assignee-cell">
                      <span className="assignee-avatar">
                        {(task.assignee_name || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="assignee-name">{task.assignee_name}</span>
                    </div>

                    <div className="card-quick-actions">
                      {canManageTasks && <button
                        type="button"
                        className="btn-reopen-status"
                        onClick={() => handleStatusChange(task.id, 'In Progress')}
                        title="Reopen Task"
                      >
                        Reopen
                      </button>}
                    </div>
                  </div>
                </div>
              ))}
              {completedTasks.length === 0 && (
                <div className="empty-col-notice">No completed tasks</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Status</th>
                {canManageTasks && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <span className="task-desc-sub">{task.description}</span>
                  </td>
                  <td>
                    <span className="project-badge">{task.project_name}</span>
                  </td>
                  <td>
                    <div className="assignee-cell">
                      <span className="assignee-avatar">
                        {(task.assignee_name || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <span>{task.assignee_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`priority-tag ${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`task-date ${isOverdue(task.deadline, task.status) ? 'overdue' : ''}`}>
                      {task.deadline || '—'}
                    </span>
                  </td>
                  <td>
                    <select
                      className="task-status-inline-select"
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    >
                      {(isEmployee
                        ? task.status === 'Pending'
                          ? ['Pending', 'In Progress']
                          : task.status === 'In Progress'
                            ? ['In Progress', 'Completed']
                            : ['Completed']
                        : ['Pending', 'In Progress', 'Completed']
                      ).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  {canManageTasks && <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-cell">
                      <button
                        type="button"
                        className="action-icon-btn edit"
                        onClick={() => handleOpenEdit(task)}
                      >
                        <EditIcon size={14} />
                      </button>
                      {task.status !== 'Completed' && <button
                        type="button"
                        className="action-icon-btn delete"
                        onClick={() => handleDelete(task.id, task.title)}
                      >
                        <TrashIcon size={14} />
                      </button>}
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {canManageTasks && <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign New Task"
        maxWidth={580}
      >
        <form onSubmit={handleSaveCreate} className="modal-form">
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Build backend API endpoints for attendance"
            />
          </div>

          <div className="form-group">
            <label>Detailed Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specific acceptance criteria, notes, and references..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Associated Project *</label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Assignee *</label>
              <select
                required
                value={formData.assignee_id}
                onChange={(e) => handleAssigneeChange(e.target.value)}
              >
                <option value="" disabled>Select an active squad member</option>
                {getProjectAssignees(formData.project_id).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Deadline Date</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Assign Task
            </button>
          </div>
        </form>
      </Modal>}

      {/* EDIT TASK MODAL */}
      {canManageTasks && <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Task: ${selectedTask?.title}`}
        maxWidth={580}
      >
        <form onSubmit={handleSaveEdit} className="modal-form">
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Associated Project</label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Assignee</label>
              <select
                required
                value={formData.assignee_id}
                onChange={(e) => handleAssigneeChange(e.target.value)}
              >
                <option value="" disabled>Select an active squad member</option>
                {getProjectAssignees(formData.project_id).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Deadline Date</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}

export default Tasks;
