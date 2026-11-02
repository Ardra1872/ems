import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getEmployees
} from '../services/api';
import Modal from '../components/common/Modal';
import {
  ProjectsIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon
} from '../components/common/Icons';
import './Projects.css';

export function Projects() {
  const { user, canCreateProjects } = useAuth();

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [teamError, setTeamError] = useState('');
  const [removedTeamMembers, setRemovedTeamMembers] = useState(0);
  const [savingTeam, setSavingTeam] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    description: '',
    client: 'Internal Core',
    manager_id: 2,
    manager_name: '',
    team_ids: [],
    start_date: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'In Progress',
    priority: 'Medium',
    progress: 25
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, empData] = await Promise.all([getProjects(), getEmployees()]);
      setProjects(projData);
      setEmployees(empData);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load projects and squad members', error);
      setLoadError(error.message || 'Could not load projects and employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const defaultManager = employees.find(e => e.role === 'manager') || employees[0];
    setFormData({
      ...initialForm,
      manager_id: defaultManager ? defaultManager.id : 1,
      manager_name: defaultManager ? defaultManager.name : 'Assigned Lead',
      team_ids: []
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      client: project.client || '',
      manager_id: project.manager_id,
      manager_name: project.manager_name,
      team_ids: project.team_ids || [],
      start_date: project.start_date,
      deadline: project.deadline,
      status: project.status,
      priority: project.priority,
      progress: project.progress || 0
    });
    setIsEditModalOpen(true);
  };

  const handleOpenTeam = (project) => {
    const savedTeamIds = (project.team_ids || []).map(Number);
    const activeEmployeeIds = new Set(
      employees
        .filter(employee => employee.status === 'Active')
        .map(employee => Number(employee.id))
    );
    const activeTeamIds = savedTeamIds.filter(id => activeEmployeeIds.has(id));

    setSelectedProject(project);
    setFormData({
      ...project,
      team_ids: activeTeamIds
    });
    setRemovedTeamMembers(savedTeamIds.length - activeTeamIds.length);
    setTeamError('');
    setIsTeamModalOpen(true);
  };

  const handleTeamMemberToggle = (empId) => {
    const current = formData.team_ids || [];
    const exists = current.includes(Number(empId));
    const updated = exists
      ? current.filter(id => Number(id) !== Number(empId))
      : [...current, Number(empId)];
    setFormData({ ...formData, team_ids: updated });
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    try {
      const mgr = employees.find(e => e.id === Number(formData.manager_id));
      const payload = {
        ...formData,
        manager_name: mgr ? mgr.name : 'Assigned Lead'
      };
      await createProject(payload);
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error creating project: ' + err.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const mgr = employees.find(e => e.id === Number(formData.manager_id));
      const payload = {
        ...formData,
        manager_name: mgr ? mgr.name : selectedProject.manager_name
      };
      await updateProject(selectedProject.id, payload);
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error updating project: ' + err.message);
    }
  };

  const handleSaveTeam = async () => {
    if (!selectedProject) return;
    setSavingTeam(true);
    setTeamError('');
    try {
      const savedProject = await updateProject(selectedProject.id, {
        team_ids: formData.team_ids.map(Number)
      });
      setProjects(current => current.map(project => (
        Number(project.id) === Number(selectedProject.id)
          ? { ...project, team_ids: savedProject.team_ids.map(Number) }
          : project
      )));
      setIsTeamModalOpen(false);
    } catch (error) {
      setTeamError(error.message || 'Could not save this project squad.');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!canCreateProjects) {
      alert('Only admins and managers can delete projects.');
      return;
    }
    if (window.confirm(`Delete project "${name}"?`)) {
      try {
        await deleteProject(id);
        loadData();
      } catch {
        alert('Failed to delete project');
      }
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(proj => {
    const matchesSearch =
      proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.client?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || proj.status === statusFilter;

    // For employees, show all or highlight their projects
    return matchesSearch && matchesStatus;
  });

  const getTeamMembers = (teamIds = []) => {
    const memberIds = new Set(teamIds.map(Number));
    return employees.filter(employee => memberIds.has(Number(employee.id)));
  };

  return (
    <div className="projects-page">
      {/* Top Banner Stats */}
      <div className="proj-stats-grid">
        <div className="proj-stat-box">
          <span className="stat-label">Total Projects</span>
          <span className="stat-num">{projects.length}</span>
        </div>
        <div className="proj-stat-box">
          <span className="stat-label">In Active Development</span>
          <span className="stat-num text-blue">
            {projects.filter(p => p.status === 'In Progress').length}
          </span>
        </div>
        <div className="proj-stat-box">
          <span className="stat-label">Planning & Roadmapped</span>
          <span className="stat-num text-orange">
            {projects.filter(p => p.status === 'Planning').length}
          </span>
        </div>
        <div className="proj-stat-box">
          <span className="stat-label">Successfully Delivered</span>
          <span className="stat-num text-green">
            {projects.filter(p => p.status === 'Completed').length}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="proj-toolbar">
        <div className="toolbar-left">
          <div className="search-input-box">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search projects by title, client or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="emp-select-filter"
          >
            <option value="All">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {canCreateProjects && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <PlusIcon size={16} />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Projects Cards List */}
      {loading ? (
        <div className="emp-loading-state"><p>Loading projects & teams...</p></div>
      ) : loadError ? (
        <div className="emp-error-state">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={loadData}>Retry</button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="emp-empty-state">
          <ProjectsIcon size={40} />
          <h4>No projects found</h4>
          <p>Create a project or adjust your filters.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => {
            const team = project.team_members || getTeamMembers(project.team_ids);
            const userId = Number(user?.id);
            const isUserInTeam = project.team_ids?.some(id => Number(id) === userId)
              || Number(project.manager_id) === userId;

            return (
              <div key={project.id} className={`project-card ${isUserInTeam ? 'my-project-highlight' : ''}`}>
                <div className="proj-card-header">
                  <div className="proj-title-group">
                    <span className="proj-client-tag">{project.client || 'Internal'}</span>
                    <h3>{project.name}</h3>
                  </div>
                  <div className="proj-tags-row">
                    <span className={`priority-tag ${project.priority?.toLowerCase()}`}>
                      {project.priority}
                    </span>
                    <span className={`status-pill ${project.status?.toLowerCase().replace(' ', '-')}`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                <p className="proj-desc">{project.description}</p>

                {/* Progress Bar */}
                <div className="proj-progress-section">
                  <div className="progress-labels">
                    <span>Delivery Progress</span>
                    <strong>{project.progress || 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="proj-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Project Lead / Manager</span>
                    <div className="lead-pill">
                      <span className="lead-avatar">
                        {(project.manager_name || 'M').slice(0, 2).toUpperCase()}
                      </span>
                      <strong className="lead-name">{project.manager_name}</strong>
                    </div>
                  </div>

                  <div className="meta-item">
                    <span className="meta-label">Delivery Deadline</span>
                    <div className="deadline-pill">
                      <CalendarIcon size={14} />
                      <span>{project.deadline || 'Ongoing'}</span>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="proj-team-section">
                  <div className="team-header-row">
                    <span className="meta-label">Team Squad ({team.length} Members)</span>
                    {canCreateProjects && (
                      <button
                        type="button"
                        className="manage-team-link"
                        onClick={() => handleOpenTeam(project)}
                      >
                        + Organize Squad
                      </button>
                    )}
                  </div>

                  <div className="team-avatars-cluster">
                    {team.length > 0 ? (
                      team.map(m => (
                        <div
                          key={m.id}
                          className="member-avatar-bubble"
                          title={`${m.name} (${m.designation})`}
                        >
                          {m.avatar || m.name.slice(0, 2).toUpperCase()}
                        </div>
                      ))
                    ) : (
                      <span className="no-team-hint">No team members linked yet</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                {canCreateProjects && (
                  <div className="proj-card-actions">
                    <button
                      type="button"
                      className="proj-action-btn edit"
                      onClick={() => handleOpenEdit(project)}
                    >
                      <EditIcon size={14} /> Edit Project
                    </button>
                    <button
                      type="button"
                      className="proj-action-btn delete"
                      onClick={() => handleDelete(project.id, project.name)}
                      title="Delete Project"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        maxWidth={620}
      >
        <form onSubmit={handleSaveCreate} className="modal-form">
          <div className="form-group">
            <label>Project Title *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Mobile App 2.0 Redesign"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Client or Initiative</label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="e.g. Fintech Corp / Core Ops"
              />
            </div>
            <div className="form-group">
              <label>Project Manager / Lead *</label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: Number(e.target.value) })}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Project Description & Scope</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Key deliverables, objectives and architecture milestones..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Deadline Date</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Initial Completion Progress ({formData.progress}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PROJECT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Project: ${selectedProject?.name}`}
        maxWidth={620}
      >
        <form onSubmit={handleSaveEdit} className="modal-form">
          <div className="form-group">
            <label>Project Title *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Client / Domain</label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Project Manager / Lead *</label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: Number(e.target.value) })}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>
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
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Progress ({formData.progress}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              />
            </div>
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
      </Modal>

      {/* ORGANIZE TEAM SQUAD MODAL */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={`Organize Team Squad: ${selectedProject?.name}`}
        maxWidth={560}
      >
        <div className="organize-team-modal">
          <p className="team-modal-sub">
            Associate employees with this project to assign tasks and grant project workspace access.
          </p>

          {removedTeamMembers > 0 && (
            <p className="team-save-notice" role="status">
              {removedTeamMembers} saved squad {removedTeamMembers === 1 ? 'member is' : 'members are'} no longer active in the employee directory and {removedTeamMembers === 1 ? 'will' : 'will'} be removed when you save.
            </p>
          )}

          <div className="team-checklist">
            {employees.filter(emp => emp.status === 'Active').map(emp => {
              const isSelected = formData.team_ids?.includes(Number(emp.id));

              return (
                <label
                  key={emp.id}
                  className={`team-check-item ${isSelected ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTeamMemberToggle(emp.id)}
                  />
                  <div className="team-emp-avatar">{emp.avatar || emp.name.slice(0, 2).toUpperCase()}</div>
                  <div className="team-emp-info">
                    <strong>{emp.name}</strong>
                    <span>{emp.designation} • {emp.department}</span>
                  </div>
                  <span className={`emp-role-tag ${emp.role}`}>{emp.role}</span>
                </label>
              );
            })}
            {employees.every(emp => emp.status !== 'Active') && (
              <p className="no-team-hint">There are no active employees available to add.</p>
            )}
          </div>

          {teamError && <p className="team-save-error" role="alert">{teamError}</p>}

          <div className="form-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={() => setIsTeamModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveTeam} disabled={savingTeam}>
              {savingTeam ? 'Saving squad...' : `Save Team Squad (${formData.team_ids?.length || 0})`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Projects;
