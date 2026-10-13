export type DemoQuestion = { prompt: string; options: string[]; correct: number; explanation: string };
export type DemoQuiz = { id: string; title: string; subject: string; description: string; minutes: number; attempts: number; questions: DemoQuestion[] };
export const demoQuizzes: DemoQuiz[] = [
 {id:'digital-literacy',title:'Digital Literacy Quiz',subject:'Digital Literacy',description:'Test your understanding of computer hardware, software and online safety.',minutes:15,attempts:2, questions:[
 {prompt:'Which of the following is an example of system software?',options:['Microsoft Word','Google Chrome','Windows Operating System','Adobe Photoshop'],correct:2,explanation:'An operating system manages hardware and runs other programs.'},
 {prompt:'Which device is primarily used to type text?',options:['Keyboard','Monitor','Speaker','Projector'],correct:0,explanation:'A keyboard is an input device used for entering text.'},
 {prompt:'What does a web browser help you do?',options:['Print money','Access websites','Charge a battery','Repair a keyboard'],correct:1,explanation:'Browsers allow users to visit and interact with websites.'},
 {prompt:'Which password is the most secure?',options:['123456','password','MyName','Blue!River47#'],correct:3,explanation:'Long, unique passwords with varied characters are more resistant to guessing.'},
 {prompt:'What should you do with a suspicious email link?',options:['Click it immediately','Share your password','Verify the sender before opening','Forward it to everyone'],correct:2,explanation:'Verify unfamiliar links and senders before interacting with them.'},
 {prompt:'Which component stores files after a computer is powered off?',options:['SSD or hard drive','RAM','Cooling fan','Monitor'],correct:0,explanation:'Storage drives retain files without power.'},
 {prompt:'What is the purpose of antivirus software?',options:['Write essays','Detect malicious software','Increase screen size','Replace the internet'],correct:1,explanation:'Antivirus applications help identify and mitigate malware.'},
 {prompt:'Which is an input device?',options:['Printer','Speaker','Mouse','Monitor'],correct:2,explanation:'A mouse sends user actions into the computer.'},
 {prompt:'What does Wi-Fi typically provide?',options:['Wireless network access','Paper storage','More battery capacity','A new monitor'],correct:0,explanation:'Wi-Fi connects compatible devices to a wireless network.'},
 {prompt:'Why should you back up important files?',options:['To delete them faster','To protect against accidental loss','To make passwords public','To slow your computer'],correct:1,explanation:'Backups allow recovery if the original files are lost.'}]},
 {id:'practical-math',title:'Practical Math Quiz',subject:'Mathematics',description:'Practice everyday calculations, decimals and fractions.',minutes:12,attempts:2,questions:[
 {prompt:'What is 3/4 expressed as a decimal?',options:['0.25','0.50','0.75','1.25'],correct:2,explanation:'Dividing 3 by 4 gives 0.75.'},
 {prompt:'What is 15% of 200?',options:['15','20','30','40'],correct:2,explanation:'0.15 multiplied by 200 is 30.'},
 {prompt:'Which fraction is equal to 1/2?',options:['2/4','2/3','3/5','1/4'],correct:0,explanation:'Two out of four equals half.'}]},
 {id:'communication',title:'Communication Skills Checkpoint',subject:'English',description:'Review clear communication, grammar and reading skills.',minutes:10,attempts:2,questions:[
 {prompt:'Which sentence is grammatically correct?',options:['She go to school.','She goes to school.','She going school.','She gone to school.'],correct:1,explanation:'A singular third-person subject takes goes in the present tense.'},
 {prompt:'What is the best way to clarify instructions?',options:['Guess','Ask a respectful question','Ignore them','Leave immediately'],correct:1,explanation:'Asking a clear question can prevent misunderstandings.'}]}
];
export const demoFlashcards = [
 {id:'literacy',title:'Digital Literacy Flashcards',subject:'Digital Literacy',teacher:'Ms. Dela Cruz',cards:[{front:'Operating system',back:'System software that manages a device and lets applications run.'},{front:'Input device',back:'Hardware used to enter data, such as a keyboard or mouse.'},{front:'Phishing',back:'A deceptive message that tries to steal information.'},{front:'Backup',back:'An additional copy of important files kept for recovery.'}]},
 {id:'math',title:'Practical Mathematics',subject:'Mathematics',teacher:'Teacher Ana',cards:[{front:'Percentage',back:'A number expressed as a share out of 100.'},{front:'Numerator',back:'The top number of a fraction.'},{front:'Decimal',back:'A number written using place values separated by a decimal point.'}]},
 {id:'english',title:'Communication Essentials',subject:'English',teacher:'Teacher Maria',cards:[{front:'Active listening',back:'Paying attention and responding to understand the speaker.'},{front:'Main idea',back:'The central point of a paragraph or passage.'}]}
];
