export enum UserRole {
  Operator = "operator",
  ProcessEngineer = "process_engineer",
  ShiftIncharge = "shift_incharge",
  ProductionManager = "production_manager",
  PlantHead = "plant_head",
  CorporateManagement = "corporate_management",
  Administrator = "administrator",
  Developer = "developer",
}

export enum HeatStatus {
  Planned = "PLANNED",
  Active = "ACTIVE",
  Complete = "COMPLETE",
  Delayed = "DELAYED",
  Paused = "PAUSED",
}

export enum NotificationCategory {
  Approval = "approval",
  Alert = "alert",
  Analysis = "analysis",
  Schedule = "schedule",
  Learning = "learning",
  System = "system",
}

export enum ConnectionStatus {
  Online = "online",
  Offline = "offline",
  Reconnecting = "reconnecting",
}
