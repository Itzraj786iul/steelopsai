export enum UserRole {
  Admin = "admin",
  PlantManager = "plant_manager",
  ProductionManager = "production_manager",
  ShiftEngineer = "shift_engineer",
  Operator = "operator",
  QualityEngineer = "quality_engineer",
  MaintenanceEngineer = "maintenance_engineer",
  DataScientist = "data_scientist",
  Viewer = "viewer",
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
