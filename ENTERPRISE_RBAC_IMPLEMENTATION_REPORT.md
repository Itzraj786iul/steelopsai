# Enterprise RBAC — Implementation Report

**Date:** 2026-07-10  
**Scope:** Authentication, JWT, RBAC, audit, user management, role dashboards  
**Constraint:** No changes to Phase 19 / 20.2 / 31 / 32 ML engines or pickles

---

## 1. Architecture

```
Browser (Next.js)
  └─ Login → POST /auth/login (EAF API :8001)
  └─ JWT in localStorage + cookie
  └─ eafClient Authorization: Bearer …
  └─ Role-filtered sidebar + AuthGuard route checks

FastAPI
  ├─ EnterpriseAuthMiddleware (JWT + permission map)
  ├─ /auth/*  /admin/*  /delays  /alerts  /notifications
  ├─ Existing ML routes (permission-gated when EAF_REQUIRE_AUTH=1)
  ├─ SQLite enterprise.db  (users, roles, permissions, audit…)
  └─ SQLite heats.db       (unchanged Heat History)
```

**LDAP/AD:** Role codes and user table are IdP-ready; map external groups → `role_code` in a future connector without changing ML.

---

## 2. RBAC matrix (summary)

| Role | Predict | Optimize | Validate | Reports | Admin | Research | Delays |
|------|---------|----------|----------|---------|-------|----------|--------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Plant Manager | view | — | — | ✓ exec | health | view | — |
| Production Manager | view | accept | ✓ | ✓ | — | — | ✓ |
| Shift Engineer | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Operator | ✓ | ✓ | ✓ | — | — | — | — |
| Quality Engineer | view | — | view | ✓ | — | ✓ | — |
| Maintenance | view | — | — | ✓ | — | — | ✓ |
| Data Scientist | view | — | — | ✓ | health | ✓ | — |
| Viewer | view | — | — | ✓ | audit | — | — |

Full permission codes: `backend/app/services/enterprise_rbac.py`

---

## 3. Database schema

**Path:** `backend/data/enterprise/enterprise.db`

Tables: `users`, `roles`, `permissions`, `role_permissions`, `departments`, `refresh_tokens`, `login_history`, `audit_logs`, `notifications`, `delay_events`, `alerts`, `operator_assignments`

---

## 4. APIs added

| Method | Path | Permission |
|--------|------|------------|
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public |
| POST | `/auth/logout` | authenticated |
| GET | `/auth/me` | authenticated |
| GET | `/auth/roles` | authenticated |
| GET/POST/PATCH | `/admin/users` | users.manage |
| GET | `/admin/dashboard` | dashboard.admin |
| GET | `/admin/audit` | audit.view |
| GET/POST | `/delays` | delay.manage / maintenance.view |
| GET/POST | `/alerts` | alerts.view / manage |
| GET/POST | `/notifications` | notifications.view |

ML routes require JWT when `EAF_REQUIRE_AUTH=1` (default). Set `EAF_REQUIRE_AUTH=0` for offline ML regression scripts.

---

## 5. Demo users (seeded)

| Email | Password | Role |
|-------|----------|------|
| admin@jspl.local | Admin@123 | Admin |
| plant.manager@jspl.local | Plant@123 | Plant Manager |
| prod.manager@jspl.local | Prod@123 | Production Manager |
| shift.a@jspl.local | Shift@123 | Shift Engineer |
| operator@jspl.local | Oper@123 | Operator |
| quality@jspl.local | Qual@123 | Quality Engineer |
| maintenance@jspl.local | Maint@123 | Maintenance |
| scientist@jspl.local | Data@123 | Data Scientist |
| viewer@jspl.local | View@123 | Viewer |

---

## 6. Frontend pages

| Route | Purpose |
|-------|---------|
| `/login` | Enterprise JWT login + demo account shortcuts |
| `/eaf/admin` | Admin system dashboard |
| `/eaf/plant-dashboard` | Plant manager KPIs |
| `/eaf/users` | User management |
| `/eaf/audit-log` | Audit trail |
| `/eaf/delays` | Delay management |
| `/eaf/alerts` | Alert center |
| `/eaf/notifications` | Notification inbox |

Sidebar **Management** section is role-filtered. Operators do not see Admin pages.

---

## 7. Security checklist

- [x] JWT access tokens (HS256, configurable secret `EAF_JWT_SECRET`)
- [x] Refresh tokens stored hashed, revocable
- [x] PBKDF2 password hashing
- [x] Account lock after 5 failed logins (15 min)
- [x] Login history
- [x] Audit log for login/user/delay actions
- [x] FastAPI middleware permission enforcement
- [x] Frontend AuthGuard + route ACL
- [x] Bearer token on all EAF API calls
- [ ] Production: rotate `EAF_JWT_SECRET`, HTTPS only, LDAP connector

---

## 8. Migration guide

1. `pip install -r backend/requirements.txt` (adds PyJWT)
2. Restart backend — enterprise DB seeds automatically
3. Ensure frontend `.env.local` has `NEXT_PUBLIC_EAF_API_URL=http://localhost:8001`
4. Do **not** set `NEXT_PUBLIC_AUTH_MODE=guest` (enterprise is default)
5. Open `/login` → use demo admin or operator
6. For ML-only scripts: `EAF_REQUIRE_AUTH=0 python release/verify_release.py`

---

## 9. Verification

| Check | Result |
|-------|--------|
| Login admin / operator | PASS |
| Operator blocked from `/admin/users` (403) | PASS |
| Admin list users | PASS |
| TypeScript / ESLint | Run after UI wiring |
| ML unchanged | Confirmed — no pickle/model edits |

---

*Enterprise layer wraps production AI. It does not retrain or alter prediction algorithms.*
