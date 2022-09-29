// Template for question elements.
const questionTemplate = document.createElement('template');
questionTemplate.innerHTML = `
  <div class="question">
    <h2 class="question-text"></h2>
    <div class="answers"></div>
  </div>
`;

// Template for answer elements.
const answerTemplate = document.createElement('template');
answerTemplate.innerHTML = `
  <div class="answer">
    <input type="radio">
    <label class="answer-text"></label>
  </div>
`;

// Function to create an element from a template.
const createElementFromTemplate = template => {
    try {
        return template.content.firstElementChild.cloneNode(true);
    } catch (error) {
        console.error(error);
        return null;
    }
};

class LoadingMessage {
    constructor(message) {
        this.message = message;
        this.dots = '';
        this.interval = null;
        this.el = document.createElement('span');
        this.el.className = 'loading-message';
        this.hide;
    }
    
    update() {
        if (this.dots.length < 3) {
            this.dots += '.';
        } else {
            this.dots = '';
        }
        
        this.el.innerText = this.message + this.dots;
    }
    
    start() {
        this.dots = '';
        this.interval = setInterval(() => this.update(), 500);
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
    
    hide() {
        this.el.style.display = 'none';
    }
    
    show() {
        this.el.style.display = '';
    }
}


class Answer {
    constructor(id, name, text, isCorrect=false) {
        this.id = id;
        this.isCorrect = isCorrect;
        this.el = createElementFromTemplate(answerTemplate);
        this.el.querySelector('.answer-text').innerHTML = text;
        this.inputEl = this.el.querySelector('input');
        this.inputEl.id = id;
        this.inputEl.name = name;
        this.el.querySelector('label').htmlFor = id;
    }
}


class Question {
    constructor(id, text, answers) {
        this.id = id;
        this.answers = answers;
        this.el = createElementFromTemplate(questionTemplate);
        this.el.id = id;
        this.el.querySelector('.question-text').innerHTML = text;
        const answersContainer = this.el.querySelector('.answers');
        answers.forEach(answer => {
            answersContainer.appendChild(answer.el)
        });
    }

    // Mark the correct answer and return a grade for the question.
    // 1 if correct, otherwise 0
    grade() {
        let score = 0;
        this.answers.forEach(answer => {
            answer.inputEl.disabled = true;
            if (answer.isCorrect) {
                answer.el.classList.add('correct');
                if (answer.inputEl.checked) {
                    score = 1;
                }
            } else {
                answer.el.classList.add('incorrect');
            }
        });
        return score;
    }
}


class Quiz {
    // Fetch quiz data and handle errors.
    static getQuestions = async () => {
        try {
            const response = (
                await fetch('https://opentdb.com/api.php?amount=10')
            );
            const data = await response.json();
            if (data.response_code !== 0) {
                return null;
            }
            const {results: questionData} = data;
            return questionData;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // Create a list of Question objects.
    static constructQuestions = questionData => {
        return questionData.map((question, i) => {
            const questionId = `q${i + 1}`;
            let answers;
            if (question.type === 'boolean') {
                answers = [
                    new Answer(`${questionId}-1`, questionId, 'True'),
                    new Answer(`${questionId}-2`, questionId, 'False'),
                ];
                if (question.correct_answer === 'True') {
                    answers[0].isCorrect = true;
                } else {
                    answers[1].isCorrect = true;
                }
            } else {
                const nums = shuffleArray(['1', '2', '3', '4']);
                answers = [
                    new Answer(
                        `${questionId}-${nums[0]}`, questionId,
                        question.correct_answer, true
                    )
                ];
                question.incorrect_answers.forEach((answer, j) => {
                    answers.push(
                        new Answer(`${questionId}-${nums[j + 1]}`,
                            questionId, answer
                        )
                    );
                });
                answers.sort((a, b) => a.id < b.id ? -1 : 1);
            }
            return new Question(questionId, question.question, answers)
        });
    }

    constructor(onSubmit) {
        this.question = [];
        this.onSubmit = onSubmit;

        this.el = document.createElement('div');
        this.el.id = 'quiz-container';
        
        this.submitButton = document.createElement('button');
        this.submitButton.innerHTML = 'Submit Quiz!';
        this.submitButton.id = 'btn-submit';
        this.submitButton.className = 'btn';
        this.submitButton.addEventListener('click', event => {
            this.onSubmit(this);
        });

        this.loadingMessage = new LoadingMessage('Loading');
    }

    // Generate and display a new quiz
    async new() {

        // Clear the quiz container and add the loading class.
        this.el.innerHTML = '';
        this.el.classList.add('loading');
        
        // Adds the animated loading message to the quiz container to inform
        // the user that the quiz is loading.
        this.el.appendChild(this.loadingMessage.el);
        this.loadingMessage.show();
        this.loadingMessage.start();
        
        // get the question data.
        const questionData = await Quiz.getQuestions();
        
        // If there is no question data, inform the user that something went
        // wrong.
        if (questionData === null) {
            this.loadingMessage.stop();
            this.loadingMessage.hide();
            this.el.innerHTML = (
                '<span class="error">Sorry, something went wrong.</span>'
            );
            this.el.classList.remove('loading');
            return;
        }

        // Fill the quiz with the questions.
        this.questions = Quiz.constructQuestions(questionData);
        this.questions.forEach(question => {
            this.el.appendChild(question.el);
        })

        // Add the submit button at the end.
        this.el.appendChild(this.submitButton);

        // Stop and hide the loading message.
        this.loadingMessage.stop();
        this.loadingMessage.hide();

        // Remove loading class from the quiz container element.
        this.el.classList.remove('loading');
    }

    // Go through all the quiz elements and call their grade method, totalling
    // the score.
    grade() {
        let score = 0;
        this.questions.forEach(question => {
            score += question.grade();
        })
        return score;
    }
}


// In-place Fisher-Yates shuffle
const shuffleArray = array => {
    for (let i = 0; i < array.length - 1; i++) {
        const randIndex = Math.floor(Math.random() * (array.length - i) + i);
        [array[i], array[randIndex]] = [array[randIndex], array[i]];
    }
    
    return array;
};


// Get the backdrop and modal for displaying results
const backdrop = document.getElementById('backdrop');
const resultsModal = document.getElementById('results-modal');

const hideModal = () => {
    backdrop.classList.remove('shown');
    resultsModal.classList.remove('shown');
};

// Create 'New Quiz' button to replace 'Submit Quiz' button on sumbitting.
const newQuizButton = document.createElement('button');
newQuizButton.innerHTML = 'New Quiz!';
newQuizButton.id = 'btn-submit';
newQuizButton.className = 'btn';

// Function to pass when constructing the quiz object.
// This is run when the quiz's submit button is clicked.
const onQuizSubmit = quiz => {
    // Scroll to the top of the page.
    document.documentElement.scrollTop = 0;

    // Grade the quiz and display the results.
    const score = quiz.grade();
    resultsModal.querySelector('#score').innerText = score;
    backdrop.classList.add('shown');
    resultsModal.classList.add('shown');

    quiz.el.querySelector('button').remove();
    quiz.el.appendChild(newQuizButton);
};

// Hide the modal when the backdrop is clicked.
backdrop.addEventListener('click', event => {
    hideModal();
});

// Hide the modal when the review button is clicked.
document.getElementById('btn-review').addEventListener('click', event => {
    hideModal();
});

// Create the quiz object and add it's associated element to the page.
const quiz = new Quiz(onQuizSubmit);
document.querySelector('main').appendChild(quiz.el);

// Add functionality to 'New Quiz' button
newQuizButton.addEventListener('click', event => {
    quiz.new();
});

// Generate a new quiz when the 'New Quiz' button is clicked on the results
// modal.
document.getElementById('btn-new').addEventListener('click', event => {
    hideModal();
    quiz.new();
});

// Generate a new quiz.
quiz.new();