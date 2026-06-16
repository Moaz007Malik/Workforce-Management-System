import mongoose from 'mongoose';

function createModel(name, collection) {
  const schema = new mongoose.Schema(
    { id: { type: String, required: true, unique: true } },
    {
      strict: false,
      versionKey: false,
      collection,
      toJSON: {
        transform: (_doc, ret) => {
          delete ret._id;
          return ret;
        },
      },
    }
  );
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const Employee = createModel('Employee', 'employees');
export const Project = createModel('Project', 'projects');
export const Task = createModel('Task', 'tasks');
export const Timesheet = createModel('Timesheet', 'timesheets');
export const Budget = createModel('Budget', 'budgets');
export const Department = createModel('Department', 'departments');
export const Skill = createModel('Skill', 'skills');
export const Notification = createModel('Notification', 'notifications');
export const AuditLog = createModel('AuditLog', 'auditlogs');
export const Risk = createModel('Risk', 'risks');
export const Issue = createModel('Issue', 'issues');
export const Leave = createModel('Leave', 'leaves');
export const Attendance = createModel('Attendance', 'attendance');
export const Document = createModel('Document', 'documents');
export const PcpRequest = createModel('PcpRequest', 'pcp_requests');
export const PcpRevision = createModel('PcpRevision', 'pcp_revisions');
export const PcpUser = createModel('PcpUser', 'pcp_users');
export const PcpApprovalChain = createModel('PcpApprovalChain', 'pcp_approval_chains');
export const PcpMasterConfig = createModel('PcpMasterConfig', 'pcp_master_config');
