# 📱 Interventions Clients — Mobile

> A React Native mobile client for managing technical interventions directly from an Odoo 18 backend.

[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge\&logo=react\&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-57-000020?style=for-the-badge\&logo=expo\&logoColor=white)](https://expo.dev/)
[![Odoo](https://img.shields.io/badge/Odoo-18.0-714B67?style=for-the-badge\&logo=odoo\&logoColor=white)](https://www.odoo.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES202x-F7DF1E?style=for-the-badge\&logo=javascript\&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📱 Overview

**Interventions Clients Mobile** is a cross-platform mobile application built with **React Native and Expo** that provides a mobile interface for an Odoo-based technical intervention management system.

Instead of requiring technicians to interact with the complete Odoo web interface, the application exposes the most important intervention workflows through a dedicated mobile experience.

```text
                    ┌─────────────────────┐
                    │      ODOO 18        │
                    │                     │
                    │ technical.intervention
                    └──────────┬──────────┘
                               │
                         JSON-RPC / HTTP
                               │
                               ▼
                    ┌─────────────────────┐
                    │   MOBILE CLIENT     │
                    │                     │
                    │  React Native       │
                    │      + Expo         │
                    └─────────────────────┘
```

The application communicates directly with Odoo's JSON-RPC endpoints rather than introducing a separate backend layer.

---

## ✨ Features

### 🔐 Odoo Authentication

Users authenticate directly against their Odoo database.

The application uses Odoo's session authentication endpoint:

```text
/web/session/authenticate
```

Credentials are sent through a JSON-RPC request and the resulting Odoo session is used for subsequent operations.

---

### 📋 Intervention List

The application retrieves interventions from the Odoo model:

```text
technical.intervention
```

using:

```text
search_read
```

The mobile client retrieves key information such as:

* Reference
* Customer
* State
* Priority

and displays the records in a mobile-friendly interface.

---

### 🔄 Pull-to-Refresh

The intervention list can be refreshed directly from the mobile interface.

```text
Pull
 ↓
Refresh
 ↓
Odoo JSON-RPC
 ↓
Updated interventions
```

This allows the application to retrieve the latest intervention state without restarting the application.

---

### 📱 Mobile Kanban

The application includes a horizontally scrollable Kanban-style interface inspired by Odoo's workflow.

Interventions are organized around their operational states:

```text
┌──────────────┐
│  BROUILLON   │
├──────────────┤
│ INT-001      │
│ Client A     │
└──────────────┘

┌──────────────┐
│  PLANIFIÉE   │
├──────────────┤
│ INT-002      │
│ Client B     │
└──────────────┘

┌──────────────┐
│   EN COURS   │
├──────────────┤
│ INT-003      │
│ Client C     │
└──────────────┘
```

---

## 🔎 Intervention Details

Selecting an intervention opens a detailed mobile view.

The application retrieves additional information from Odoo including:

* Customer
* Technician
* State
* Priority
* Description
* Diagnosis
* Solution

The detail screen also exposes workflow actions directly to the user.

---

## ⚙️ Workflow Actions

The mobile client doesn't simply modify a local copy of an intervention.

Workflow operations are executed on the **Odoo backend**.

```text
Mobile
  │
  │ action_planifier
  ▼
Odoo
  │
  │ update technical.intervention
  ▼
PostgreSQL
```

Supported workflow transitions include:

| Current state | Action    | Next state |
| ------------- | --------- | ---------- |
| Brouillon     | Planifier | Planifiée  |
| Planifiée     | Démarrer  | En cours   |
| En cours      | Terminer  | Terminée   |

The application also exposes:

* ❌ Cancel intervention
* ↩️ Return to draft

These actions call the corresponding methods on the Odoo model.

---

## ➕ Create an Intervention

New interventions can be created directly from the mobile application.

The creation workflow includes:

### Customer

The application searches Odoo's:

```text
res.partner
```

model while the user types.

Searches use:

```text
ilike
```

to provide customer matching.

### Intervention type

The user can select the intervention type.

### Priority

Available priorities can be selected directly from the mobile interface.

### Description

The technician can enter the reported problem.

The application then sends the data directly to Odoo:

```text
technical.intervention.create()
```

with:

```text
partner_id
intervention_type
priority
description
```

---

## 🧠 Architecture

The application uses a lightweight architecture:

```text
┌─────────────────────────────────────────┐
│             React Native App            │
│                                         │
│  ┌───────────┐  ┌───────────────────┐  │
│  │   Login   │  │ Intervention List │  │
│  └───────────┘  └───────────────────┘  │
│                                         │
│  ┌───────────┐  ┌───────────────────┐  │
│  │  Kanban   │  │ Intervention     │  │
│  │           │  │ Details          │  │
│  └───────────┘  └───────────────────┘  │
│                                         │
│             JSON-RPC Client             │
└────────────────────┬────────────────────┘
                     │
                     │ HTTP
                     ▼
┌─────────────────────────────────────────┐
│                 Odoo 18                 │
│                                         │
│  /web/session/authenticate               │
│  /web/dataset/call_kw                    │
│                                         │
│  technical.intervention                  │
│  res.partner                             │
└────────────────────┬────────────────────┘
                     │
                     ▼
               PostgreSQL
```

---

## 🔌 Odoo Integration

A central helper is used to communicate with Odoo:

```javascript
callOdoo(model, method, args, kwargs)
```

It sends JSON-RPC requests to:

```text
/web/dataset/call_kw
```

This allows the mobile application to call Odoo ORM methods directly.

Examples include:

```text
search_read()
read()
create()
action_planifier()
action_demarrer()
action_terminer()
action_annuler()
action_remettre_en_brouillon()
```

The application therefore acts as a **custom mobile frontend for the Odoo ORM** rather than duplicating the business logic in JavaScript.

---

## 🔐 Why the Business Logic Stays in Odoo

One important architectural decision is that state transitions are executed by Odoo.

Instead of implementing:

```javascript
if (state === "brouillon") {
    state = "planifiee";
}
```

the mobile application calls the Odoo business method:

```text
action_planifier()
```

This keeps the business rules centralized.

```text
                 Odoo
        ┌────────────────────┐
        │ Business Logic     │
        │                    │
        │ Validation         │
        │ State transitions  │
        │ Permissions        │
        │ Database updates   │
        └─────────┬──────────┘
                  │
                  │ JSON-RPC
                  │
             ┌────▼────┐
             │ Mobile  │
             │ Client  │
             └─────────┘
```

This means the web interface and mobile application can rely on the same backend workflow.

---

## 🧰 Tech Stack

| Technology              | Role                               |
| ----------------------- | ---------------------------------- |
| **React Native 0.86.3** | Mobile application framework       |
| **Expo 57**             | Development & native build tooling |
| **JavaScript**          | Application logic                  |
| **Odoo 18**             | Backend / business logic           |
| **JSON-RPC**            | Mobile ↔ Odoo communication        |
| **PostgreSQL**          | Persistent data storage            |

The current project configuration specifies Expo `~57.0.24`, React `19.2.3`, and React Native `0.86.3`.

---

## 📁 Project Structure

```text
intervention-mobile/
│
├── App.js
│
├── assets/
│
├── app.json
├── eas.json
├── index.js
│
├── package.json
├── package-lock.json
│
├── .gitignore
└── LICENSE
```

The current application logic is centralized in `App.js`, which contains the authentication flow, Odoo communication layer, intervention operations, screens and UI components.

---

## 🚀 Getting Started

### Prerequisites

Before running the application, make sure you have:

* Node.js
* npm
* Expo
* React Native development environment
* A running Odoo 18 instance
* An Odoo database containing the intervention module

---

### 1. Clone the repository

```bash
git clone https://github.com/KASPAROV2005/intervention-mobile.git

cd intervention-mobile
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Odoo

Configure the application with the address of your Odoo server and the target database.

The mobile application expects the Odoo backend to expose the JSON-RPC endpoints:

```text
/web/session/authenticate
/web/dataset/call_kw
```

### 4. Start Expo

```bash
npm start
```

Or:

```bash
npx expo start
```

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

### Web

```bash
npm run web
```

These commands correspond to the project's current npm scripts.

---

## 🔄 Data Flow

### Login

```text
User
 │
 │ login + password
 ▼
React Native
 │
 │ JSON-RPC
 ▼
Odoo /web/session/authenticate
 │
 ▼
Odoo Session
```

### Load interventions

```text
Mobile
 │
 │ search_read()
 ▼
technical.intervention
 │
 ▼
Odoo ORM
 │
 ▼
PostgreSQL
 │
 ▼
JSON response
 │
 ▼
React Native
```

### Update intervention

```text
User
 │
 │ "Démarrer"
 ▼
Mobile
 │
 │ action_demarrer()
 ▼
Odoo
 │
 ▼
technical.intervention
 │
 ▼
Updated state
 │
 ▼
Mobile UI
```

---

## 🧩 Odoo Concepts Demonstrated

This project demonstrates how an external mobile client can interact with Odoo's internal application layer through JSON-RPC.

Key concepts include:

* Odoo session authentication
* JSON-RPC
* `/web/dataset/call_kw`
* Odoo ORM methods
* `search_read()`
* `read()`
* `create()`
* `res.partner`
* `technical.intervention`
* Server-side business methods
* Workflow/state management
* Session-based communication
* Mobile frontend integration
* Backend/frontend synchronization

---

## 🛡️ Security Considerations

The application authenticates against Odoo rather than maintaining a separate user database.

Because the mobile client communicates directly with the Odoo backend, production deployments should use:

* HTTPS
* Strong user credentials
* Proper Odoo access rights
* Appropriate record rules
* Secure database configuration
* Restricted server exposure

**Never hard-code production credentials into the application.**

---

## ⚠️ Current Limitations

The current implementation is intentionally lightweight.

Potential areas for improvement include:

* 🔄 Background synchronization
* 📴 Offline mode
* 🔁 Conflict resolution
* 🔔 Push notifications
* 📍 GPS/location support
* 📷 Photo attachments
* ✍️ Customer signatures
* 📎 File attachments
* 🔐 Secure credential/session storage
* 📄 PDF intervention reports
* 📊 Mobile statistics
* ⚡ Pagination for large datasets
* 🔌 Network retry handling

---

## 🚀 Future Architecture

A more advanced version could evolve toward:

```text
                         ODOO 18
                            │
                     JSON-RPC / API
                            │
              ┌─────────────┴─────────────┐
              │                           │
        Web Interface               Mobile Client
              │                           │
              │                     Local Storage
              │                           │
              │                     Sync Engine
              │                           │
              └─────────────┬─────────────┘
                            │
                    Synchronization
                    + Conflict Handling
```

This would allow technicians to continue working when network connectivity is unreliable and synchronize their work once the connection is restored.

---

## 🔗 Related Project

This mobile application is designed to work with the Odoo intervention-management backend:

**Intervention Client — Odoo 18**

```text
https://github.com/KASPAROV2005/intervention-client-odoo
```

Together:

```text
┌─────────────────────────┐
│      Odoo 18            │
│                         │
│ Intervention Management │
└────────────┬────────────┘
             │
             │ JSON-RPC
             │
┌────────────▼────────────┐
│    Mobile Application   │
│                         │
│ React Native + Expo     │
└─────────────────────────┘
```

---

## 👨‍💻 Author

**Walid Islah**

IT / Computer Science Graduate
Interested in Full-Stack Development, Odoo, Cybersecurity & Networking.

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">

**Built with React Native × Expo × Odoo**

</p>
