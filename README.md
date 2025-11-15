# notes_new
 
UI : 

User Action (click/input)
     ↓
Handled by → AppController (wires all events)
     ↓
Delegates to → PageManager / SearchManager / ModalManager
     ↓
Uses → HistoryManager (for state tracking)
     ↓
DOM updates / fetches / render content
