<script>
    import Sidebar from "./Sidebar.svelte";
    
    let title = "Untitled form";
    let description = "Form description (optional)";
      
    let sections = [
      {
        title: "Section 1",
        description: "Description (optional)",
        questions: [
          { label: "Question 1", type: "radio", options: ["Option 1", "Option 2"] }
        ]
      }
    ];
  
    let selectedQuestion = null;
  
    const questionTypes = ["text", "email", "radio", "checkbox"];
  
    function handleQuestionClick(sectionIndex, questionIndex) {
      selectedQuestion = { sectionIndex, questionIndex };
    }
  
    function changeQuestionType(type) {
      if (selectedQuestion) {
        const question = sections[selectedQuestion.sectionIndex].questions[selectedQuestion.questionIndex];
        question.type = type;
  
        if (type === "radio" || type === "checkbox") {
          question.options = ["Option 1", "Option 2"];
        } else {
          delete question.options;
        }
  
        selectedQuestion = null;
      }
    }
  </script>
  
  <div class="flex">
    <Sidebar />
  
    <div class="floating-top-bar fixed top-0 left-0 w-full bg-white shadow-md border-b border-gray-200 z-50">
      <div class="flex justify-center items-center space-x-6 text-gray-700 py-3">
        <button class="hover:text-green-700 focus:outline-none font-semibold">Forms</button>
        <button class="hover:text-green-700 focus:outline-none font-semibold">Responses</button>
        <button class="hover:text-green-700 focus:outline-none font-semibold">Settings</button>
        <button class="hover:text-green-700 focus:outline-none font-semibold">Send</button>
      </div>
    </div>
  
    <div class="main-content pt-16 p-8 bg-light-green min-h-screen">
      <div class="bg-white p-6 rounded-lg shadow-lg custom-top-border mb-6">
        <input bind:value={title} class="w-full text-3xl font-semibold text-gray-800 mb-2 bg-transparent border-b border-gray-300 focus:outline-none focus:border-green-600" placeholder="Form Title" />
        <textarea bind:value={description} class="w-full text-gray-600 mb-4 bg-transparent border-b border-gray-300 focus:outline-none focus:border-green-600" placeholder="Form Description"></textarea>
      </div>
  
      {#each sections as section, sectionIndex}
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-green-700 mb-4">{section.title}</h2>
          {#each section.questions as question, questionIndex}
            <div 
              class="question-box mb-4 p-4 rounded-lg shadow-sm border border-gray-300 bg-gray-50 relative"
              on:click={() => handleQuestionClick(sectionIndex, questionIndex)}
            >
              <input bind:value={question.label} class="w-full text-lg font-medium text-gray-800 bg-transparent border-b border-gray-300 focus:outline-none focus:border-green-600 mb-2" placeholder="Question" />
  
              {#if selectedQuestion && selectedQuestion.sectionIndex === sectionIndex && selectedQuestion.questionIndex === questionIndex}
                <button 
                  class="absolute top-2 right-2 bg-green-700 text-white py-1 px-2 rounded-lg focus:outline-none"
                  on:click|stopPropagation={() => (selectedQuestion.showDropdown = !selectedQuestion.showDropdown)}
                >
                  {question.type}
                </button>
  
                {#if selectedQuestion.showDropdown}
                  <div class="absolute top-10 right-2 bg-white shadow-md rounded-lg p-2 z-10 border">
                    {#each questionTypes as type}
                      <div 
                        class="cursor-pointer hover:bg-gray-100 p-2 text-gray-700"
                        on:click={() => changeQuestionType(type)}
                      >
                        {type}
                      </div>
                    {/each}
                  </div>
                {/if}
              {/if}
  
              {#if question.type === 'text' || question.type === 'email'}
                <input type={question.type} class="w-full mt-2 p-3 bg-white focus:outline-none focus:border-green-600" placeholder="Short answer text" disabled />
              {:else if question.type === 'radio'}
                {#each question.options as option}
                  <div class="flex items-center mt-2">
                    <input type="radio" class="text-green-600" disabled />
                    <span class="ml-2 text-gray-700">{option}</span>
                  </div>
                {/each}
              {:else if question.type === 'checkbox'}
                {#each question.options as option}
                  <div class="flex items-center mt-2">
                    <input type="checkbox" class="text-green-600" disabled />
                    <span class="ml-2 text-gray-700">{option}</span>
                  </div>
                {/each}
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  
  <style>
    .bg-light-green {
      background-color: #eaf7ed;
    }
  
    .main-content {
      margin-left: 16rem;
      width: calc(100% - 16rem);
    }
  
    .floating-top-bar {
      margin-left: 16rem;
      width: calc(100% - 16rem);
    }
  
    aside {
      width: 16rem;
    }
  
    .question-box {
      background-color: white;
    }
  
    .custom-top-border {
      border-top: 10px solid #136734;
    }
  </style>