import React from 'react';
import logo from './logo.svg';
import './App.css';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
} from "react-router-dom";
import ImportEM from './pages/ImportEM';
function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<ImportEM />}></Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
