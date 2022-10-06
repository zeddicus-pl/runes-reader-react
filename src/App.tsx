import React from 'react';
import './App.css';
import SaveReader from './SaveReader';

function App() {

  const myButton = () => (
    <button
      style={{
        fontSize: 20,
      }}
      onClick={() => {
        console.log('underneath button was pressed')
      }}
    >
      Read all your save files at once
    </button>
  );

  return (
    <div className="App" style={{ padding: 30 }}>
      <p>This is a small React components that finds all of the unsocketed runes in your save files and outputs it into console.</p>
      <SaveReader
        element={myButton()}
        onSubmit={(data) => console.log(data)}
      />
    </div>
  );
}

export default App;
