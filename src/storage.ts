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
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading medications:', error);
      return [];
    }
  }

  saveMedications(medications: Medication[]): void {
    try {
      fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(medications, null, 2));
    } catch (error) {
      console.error('Error saving medications:', error);
    }
  }

  addMedication(medication: Medication): void {
    const medications = this.getMedications();
    medications.push(medication);
    this.saveMedications(medications);
  }

  removeMedication(id: string): boolean {
    const medications = this.getMedications();
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
    const index = medications.findIndex(med => med.id === id);
    
    if (index !== -1) {
      medications[index] = { ...medications[index], ...updates };
      this.saveMedications(medications);
      return true;
    }
    return false;
  }

  getUserMedications(userId: string): Medication[] {
    return this.getMedications().filter(med => med.userId === userId);
  }
}