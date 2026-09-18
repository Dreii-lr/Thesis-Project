export type ContentFile = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LessonFolder = {
  id: string;
  title: string;
  files: ContentFile[];
};

export type Module = {
  id: string;
  title: string;
  subtitle: string;
  lessons: LessonFolder[];
};

export const mockModules: Module[] = [
  {
    id: "lesson-1",
    title: "Lesson 1: Introduction to Computing",
    subtitle: "Junior High - Drafts",
    lessons: [
      {
        id: "folder-1",
        title: "Lesson 1: Introduction to...",
        files: [
          {
            id: "file-1",
            title: "Introduction & Overview",
            paragraphs: [
              "Welcome to the Introduction to Computing.",
              "In this module, we will explore the fundamental concepts that make up modern computer systems.",
            ],
          },
          {
            id: "file-2",
            title: "Core Concepts",
            paragraphs: [
              "Before we can talk about how a computer works, it's important to understand the relationship between hardware and software.",
              "Hardware is any part of your computer that has a physical structure, such as the keyboard or mouse. It also includes all of the computer's internal parts.",
              "Software is any set of instructions that tells the hardware what to do and how to do it. Examples of software include web browsers, games, and word processors.",
            ],
          },
        ],
      },
      {
        id: "folder-2",
        title: "Lesson 2: Advance Topics",
        files: [
          {
            id: "file-3",
            title: "Networking Basics",
            paragraphs: [
              "A computer network is a set of computers sharing resources located on or provided by network nodes.",
              "The most common example of a network is the Internet.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "lesson-2",
    title: "Lesson 2: Data Structures",
    subtitle: "Senior High - Published",
    lessons: [
      {
        id: "folder-3",
        title: "Basic Structures",
        files: [
          {
            id: "file-4",
            title: "Arrays and Lists",
            paragraphs: ["An array is a data structure consisting of a collection of elements, each identified by at least one array index or key."],
          }
        ]
      }
    ]
  }
];