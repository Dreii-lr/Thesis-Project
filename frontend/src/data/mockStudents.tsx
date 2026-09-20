export type Student = {
  id: string;
  level: string; // Used in the table view

  // Personal Details
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  gender: string;
  birthDate: string;
  nationality: string;
  civilStatus: string;
  religion: string;
  placeOfBirth: string;
  lrn: string;

  // Contact Details[cite: 11]
  street: string;
  barangay: string;
  city: string;
  province: string;
  phone: string;
  email: string;

  // Family[cite: 11]
  motherName: string;
  fatherName: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
};

export const mockStudents: Student[] = [
  { 
    id: 'ALS-0001', 
    level: 'Junior High School',
    
    // Personal Details
    firstName: 'Juan',
    middleName: 'Reyes',
    lastName: 'Dela Cruz',
    suffix: '',
    gender: 'Male',
    birthDate: '2008-05-14',
    nationality: 'Filipino',
    civilStatus: 'Single',
    religion: 'Catholic',
    placeOfBirth: 'Manila',
    lrn: '109876543210',
    
    // Contact Details
    street: '123 Rizal St',
    barangay: 'Barangay 1',
    city: 'Quezon City',
    province: 'Metro Manila',
    email: 'juandelacruz@example.com', 
    phone: '09123456789',
    
    // Family
    motherName: 'Maria Dela Cruz',
    fatherName: 'Pedro Dela Cruz',
    guardianName: 'Pedro Dela Cruz',
    guardianRelation: 'Father',
    guardianPhone: '09198765432'
  },
  { 
    id: 'ALS-0002', 
    level: 'Junior High School',
    
    // Personal Details
    firstName: 'Jobert',
    middleName: 'V',
    lastName: 'Baldozino',
    suffix: 'Jr.',
    gender: 'Male',
    birthDate: '2007-11-22',
    nationality: 'Filipino',
    civilStatus: 'Single',
    religion: 'Christian',
    placeOfBirth: 'Cebu City',
    lrn: '109876543211',
    
    // Contact Details
    street: '456 Mabini Ave',
    barangay: 'Guadalupe',
    city: 'Cebu City',
    province: 'Cebu',
    email: 'jobert.baldozino1@example.com', 
    phone: '09123456784',
    
    // Family
    motherName: 'Teresa Baldozino',
    fatherName: 'Jobert Baldozino Sr.',
    guardianName: 'Teresa Baldozino',
    guardianRelation: 'Mother',
    guardianPhone: '09223334444'
  },
  { 
    id: 'ALS-0003', 
    level: 'Junior High School',
    
    // Personal Details
    firstName: 'Kulas',
    middleName: 'M',
    lastName: 'Batumbakal',
    suffix: '',
    gender: 'Male',
    birthDate: '2009-02-10',
    nationality: 'Filipino',
    civilStatus: 'Single',
    religion: 'Catholic',
    placeOfBirth: 'Davao',
    lrn: '109876543212',
    
    // Contact Details
    street: '789 Bonifacio St',
    barangay: 'Poblacion',
    city: 'Davao City',
    province: 'Davao del Sur',
    email: 'kulasasubas188@example.com', 
    phone: '09123456787',
    
    // Family
    motherName: 'Elena Batumbakal',
    fatherName: 'Ricardo Batumbakal',
    guardianName: 'Elena Batumbakal',
    guardianRelation: 'Mother',
    guardianPhone: '09176543210'
  },
];