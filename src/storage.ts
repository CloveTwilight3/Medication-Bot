import fs from 'fs';
import path from 'path';
import { Medication } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEDICATIONS_FILE = path.join(DATA_DIR, 'medications.json');

export class Storage {
  constructor() {
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEDICATIONS_FILE)) {
      fs.writeFileSync(MEDICATIONS_FILE, '[]');
    }
  }

  getMedications(): Medication[] {
    try {
      const data = fs.readFileSync(MEDICATIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // Ensure the parsed data is an array
      if (!Array.isArray(parsed)) {
        console.warn('Medications data is not an array, resetting to empty array');
        this.saveMedications([]);
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Error reading medications:', error);
      console.log('Resetting medications file to empty array');
      this.saveMedications([]);
      return [];
    }
  }

  saveMedications(medications: Medication[]): void {
    try {
      // Ensure we're always saving an array
      if (!Array.isArray(medications)) {
        console.warn('Attempting to save non-array data, converting to empty array');
        medications = [];
      }
      fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(medications, null, 2));
    } catch (error) {
      console.error('Error saving medications:', error);
    }
  }

  addMedication(medication: Medication): void {
    const medications = this.getMedications();
    // Double-check that medications is an array before pushing
    if (!Array.isArray(medications)) {
      console.error('getMedications did not return an array, creating new array');
      this.saveMedications([medication]);
      return;
    }
    medications.push(medication);
    this.saveMedications(medications);
  }

  removeMedication(id: string): boolean {
    const medications = this.getMedications();
    if (!Array.isArray(medications)) {
      console.error('getMedications did not return an array');
      return false;
    }
    
    const initialLength = medications.length;
    const filtered = medications.filter(med => med.id !== id);
    
    if (filtered.length < initialLength) {
      this.saveMedications(filtered);
      return true;
    }
    return false;
  }

  updateMedication(id: string, updates: Partial<Medication>): boolean {
    const medications = this.getMedications();
    if (!Array.isArray(medications)) {
      console.error('getMedications did not return an array');
      return false;
    }
    
    const index = medications.findIndex(med => med.id === id);
    
    if (index !== -1) {
      medications[index] = { ...medications[index], ...updates };
      this.saveMedications(medications);
      return true;
    }
    return false;
  }

  getUserMedications(userId: string): Medication[] {
    const medications = this.getMedications();
    if (!Array.isArray(medications)) {
      console.error('getMedications did not return an array');
      return [];
    }
    return medications.filter(med => med.userId === userId);
  }
}