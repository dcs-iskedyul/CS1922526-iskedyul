import { writable } from 'svelte/store';

export const rooms = [
    { name: "TBA", capacity: 0},
    { name: "AECH Accenture Rm", capacity: 90 },
    { name: "AECH ERDT Rm", capacity: 35 },
    { name: "AECH CLR1", capacity: 25 },
    { name: "AECH CLR2", capacity: 25 },
    { name: "AECH CLR3", capacity: 30 },
    { name: "AECH CLR4", capacity: 32 },
    { name: "AECH TL1", capacity: 28 },
    { name: "AECH TL2", capacity: 28 },
    { name: "AECH TL3", capacity: 29 },
    { name: "AECH Seminar Room", capacity: 28 },
    { name: "AECH 200", capacity: 16 },
    { name: "AECH 310", capacity: 16 },
    { name: "AECH 315", capacity: 15 },
    { name: "MH Engineering Theater", capacity: 220 },
    { name: "MH 507-509", capacity: 25 },
    { name: "MH 511-513", capacity: 25 },
];

//for now, each subject has the properties:
// year: UG1, UG2, UG3, UG4, G
// semester: 1, 2, 3 = midyear
//kulang: 197
export const subject_info = {
    "CS 11": {"year": "UG1", "semester": 1, "units": 3, "lecTL":2, "labTL":1.5},
    "CS 30": {"year": "UG1", "semester": 1, "units": 3, "lecTL":3},
    "CS 10": {"year": "UG1", "semester": 1, "units": 3, "lecTL":3},

    "CS 12": {"year": "UG1", "semester": 2, "units": 3, "lecTL":2, "labTL":1.5},
    "CS 31": {"year": "UG1", "semester": 2, "units": 3, "lecTL":3},

    "CS 20": {"year": "UG2", "semester": 1, "units": 3, "lecTL":3, "labTL":1.5},
    "CS 32": {"year": "UG2", "semester": 1, "units": 4, "lecTL":3, "labTL":1.5},

    "CS 136": {"year": "UG2", "semester": 2, "units": 3, "lecTL":3},
    "CS 33": {"year": "UG2", "semester": 2, "units": 4, "lecTL":3, "labTL":1.5},
    "CS 21": {"year": "UG2", "semester": 2, "units": 4, "lecTL":3, "labTL":1.5},

    "CS 150": {"year": "UG3", "semester": 1, "units": 3, "lecTL":3, "labTL":1.5},
    "CS 140": {"year": "UG3", "semester": 1, "units": 4, "lecTL":3, "labTL":1.5},
    "CS 191": {"year": "UG3", "semester": 1, "units": 3, "lecTL":3},
    "CS 180": {"year": "UG3", "semester": 1, "units": 3, "lecTL":3},
    "CS 138": {"year": "UG3", "semester": 1, "units": 3, "lecTL":3},

    "CS 165": {"year": "UG3", "semester": 2, "units": 4, "lecTL":3, "labTL":1.5},
    "CS 145": {"year": "UG3", "semester": 2, "units": 4, "lecTL":3, "labTL":1.5},
    "CS 153": {"year": "UG3", "semester": 2, "units": 3, "lecTL":3},
    "CS 192": {"year": "UG3", "semester": 2, "units": 3, "lecTL":3},
    "CS 194": {"year": "UG3", "semester": 2, "units": 1, "lecTL":3},

    "CS 195": {"year": "UG3", "semester": 3, "units": 3, "lecTL":3},//not sure

    "CS 133": {"year": "UG4", "semester": 1, "units": 3, "lecTL":3},
    "CS 198": {"year": "UG4", "semester": 1, "units": 3, "lecTL":4},

    "CS 196": {"year": "UG4", "semester": 2, "units": 1, "lecTL":1},
    "CS 155": {"year": "UG4", "semester": 2, "units": 3, "lecTL":2, "labTL":1.5},
    "CS 132": {"year": "UG4", "semester": 2, "units": 3, "lecTL":3},
    "CS 199": {"year": "UG4", "semester": 2, "units": 3, "lecTL":4},
    "CS 200": {"year": "UG4", "semester": 2, "units": 3, "lecTL":4},
    "CS Elective": {"year": "UG3", "semester": 2, "units": 3, "lecTL":3}

}
export const schedules = [
    "1",
    "2",
    "3",
]

export const semesters = [
    "1",
    "2"
]

export var instructors = [
    ["ADDAWE, JOZELLE", 9, "UNDERGRAD"],
    ["ADORNA, HENRY", 12, ""],
    ["ATIENZA, KEVIN CHARLES", 9, "UNDERGRAD"],
    ["BELTRAN, JEROME CARY", 12, "UNDERGRAD"],
    ["BUNO, KELVIN", 12, "UNDERGRAD"],
    ["CABARLE, FRANCIS GEORGE", 12, ""],
    ["CARO, JAIME", 0, ""],
    ["CARREON, MARIO", 0, "UNDERGRAD"],
    ["CLEMENTE, JHOIRENE", 12, ""],
    ["CORONEL, JUAN FELIPE", 9, "UNDERGRAD"],
    ["FERIA, ROMEL", 12, "UNDERGRAD"],
    ["FESTIN, CEDRIC ANGELO", 12, ""],
    ["FESTIN, SUSAN", 12, ""],
    ["FIGUEROA, LIGAYA LEAH", 12, ""],
    ["GABUD, ROSELYN", 12, ""],
    ["HERNANDEZ, NESTINE HOPE", 12, "UNDERGRAD"],
    ["JUAYONG, RICHELLE", 12, ""],
    ["LABAO, ALFONSO", 12, ""],
    ["MARTINEZ, MIGUEL LUIS", 9, "UNDERGRAD"],
    ["NAVAL, PROSPERO", 12, ""],
    ["ORDANEL, IVY", 12, ""],
    ["RAQUEL, CARLO", 12, "UNDERGRAD"],
    ["REGONIA, PAUL ROSSENER", 12, ""],
    ["SAMPEDRO, GABRIEL AVELINO", 12, ""],
    ["SOLAMO, MA. ROWENA", 12, ""],
    ["SORIANO, JAYMAR", 12, ""],
    ["TAN, WILSON", 12, ""],
    ["VALDEZ, ADRIAN ROY", 12, ""],
    ["VILLAR, JOHN JUSTINE", 12, ""],
    ["YAP, JAN MICHAEL", 12, ""],
    ["ZUNIGA, PHILIP CHRISTIAN", 12, "UNDERGRAD"],
    ["DE LA CRUZ, REN", 6, "UNDERGRAD"],
    ["BOQUE, CYRUS", 6, "UNDERGRAD"],
    ["CAPULONG, RIZALDY", 6, "UNDERGRAD"],
    ["MAGADIA, JOSELITO", 6, "BIOINFO"],
    ["BASCOS, NEIL", 6, "BIOINFO"],
    ["DE LA CRUZ, REN TRISTAN", 6, "UNDERGRAD"]
]

export const storeClasses = writable([])

export const obligationClasses = {
    "1" : ["CS 10", "CS 11", "CS 30", "CS 20", "CS 32", "CS 138", "CS 140", "CS 150", "CS 180", "CS 191", "CS 133", "CS 198"],
    "2" : ["CS 12", "CS 21", "CS 31", "CS 33", "CS 136", "CS 145", "CS 153", "CS 165", "CS 192", "CS 194", "CS 132", "CS 155", "CS 196", "CS 199", "CS 200"]
}

export const labSubjects = ["CS 11", "CS 20", "CS 32", "CS 140", "CS 150", "CS 191", "CS 12", "CS 21", "CS 33", "CS 145", "CS 165", "CS 192", "CS 155", "ES 26"]

export const blocks = {
    "1" : [["CS 10", "CS 11", "CS 30"], ["CS 20", "CS 32"], ["CS 138", "CS 140", "CS 150", "CS 180", "CS 191"], ["CS 133", "CS 198"]],
    "2" : [["CS 12", "CS 31"], ["CS 21", "CS 33", "CS 136"], ["CS 145", "CS 153", "CS 165", "CS 192", "CS 194"], ["CS 132", "CS 155", "CS 196"]]
}

export const delayed_blocks = {
    "1" : {
        'Delayed because of CS 31' : ['CS 20', 'CS 31'], 
        'Delayed because of CS 21' : ["CS 138", "CS 21", "CS 150", "CS 180", "CS 191"],
        'Delayed because of CS 33' : ["CS 138", "CS 140", "CS 33", "CS 180", "CS 191"]
    },
    "2" : {
        'Delayed because of CS 30' : ['CS 12', 'CS 30'], 
        'Delayed because of CS 20' : ["CS 20", "CS 33", "CS 136"],
        'Delayed because of CS 32' : ["CS 21", "CS 32", "CS 136"]
    }
}

export const conflictsStore = writable({});

function haveCommonItems(str1, str2) {
    var arr1 = str1.split(',');
    var arr2 = str2.split(',');
    // console.log(arr1, arr2)
    const set1 = new Set(arr1);
    const commonItems = arr2.filter((item) => set1.has(item));
    // console.log(commonItems.length > 0)
    return commonItems, commonItems.length > 0;
}

export function timeOnlyConflict(class1, class2){
    var s_t = convertTimeToNumber(class1.start_time)
    var e_t = convertTimeToNumber(class1.end_time)
    var n_s_t = convertTimeToNumber(class2.start_time)
    var n_e_t = convertTimeToNumber(class2.end_time)
    if ((s_t >= n_s_t && s_t < n_e_t) || (e_t > n_s_t && e_t <= n_e_t) || (s_t <= n_s_t && e_t >= n_e_t)){
        return true
    }
    return false
}

export function timeConflict(class1, class2){
    var common_days, check
    common_days, check = haveCommonItems(class1.days, class2.days);
    if(check){
        return timeOnlyConflict(class1, class2)
    }
    return false
}

function convertTimeToNumber(time) {
    const hours = Number(time.split(':')[0]);
    const minutes = Number(time.split(':')[1]) / 60;
    return hours + minutes;
}

export function parseForConflicts(data) {
    var conflicts = [];
    
    console.log("Parsing conflicts with data:", data);
    
    var clas, loc, s_t, e_t, n_clas, n_loc, n_s_t, n_e_t, check, teacher, n_teacher, common_days;
    var types_of_conflict;
    
    for (var i = 0; i < data.length; i++) {
        clas = data[i];
        
        loc = clas.location;
        teacher = clas.instructor;
        
        if (!clas.start_time || !clas.end_time) {
            console.warn("Class missing time data:", clas);
            continue;
        }
        
        for (var j = i + 1; j < data.length; j++) {
            n_clas = data[j];

            if (clas.schedule !== n_clas.schedule) continue;
            
            if (!n_clas.start_time || !n_clas.end_time) {
                console.warn("Class missing time data:", n_clas);
                continue;
            }
            
            n_loc = n_clas.location;
            n_teacher = n_clas.instructor;
            types_of_conflict = [];
            
            if (n_loc == loc && loc !== 'TBA' && n_loc !== 'TBA')
                types_of_conflict.push("Room Conflict");
            
            if (n_teacher == teacher && teacher !== 'TBA' && n_teacher !== 'TBA')
                types_of_conflict.push("Instructor Conflict");
            
            if (types_of_conflict.length > 0) {
                if (!clas.days || !n_clas.days) {
                    console.warn("Class missing days data:", clas, n_clas);
                    continue;
                }
                
                const class1Id = clas.section || clas.class_id;
                const class2Id = n_clas.section || n_clas.class_id;
                
                if(timeConflict(clas, n_clas)){
                    conflicts.push([
                    clas.course + ' ' + class1Id, 
                    n_clas.course + ' ' + class2Id, 
                    types_of_conflict.join(", "), 
                    clas.schedule
                    ]);
                
                    console.log("Found conflict:", clas.course + ' ' + class1Id, "and", n_clas.course + ' ' + class2Id);
                }
            }
        }
    }
    
    console.log("Total conflicts found:", conflicts.length);
    console.log("Conflicts: ", conflicts)

    return conflicts

    // conflictsStore.set(conflicts);
    // console.log(conflictsStore)
}


export function parseForWarnings(subjects){
    
    var lab_classes = {}

    var lec_classes = {}

    var instructor_classes = {}

    var lab_warnings = []

    var same_time_warnings = []
    var instructors = []
    var consecutive_warnings = []


    for(var i = 0; i < subjects.length; i++){

        var course = subjects[i].course
        if(labSubjects.includes(subjects[i].course) && subjects[i].type == "Lab"){
            if (course in lab_classes){
                (lab_classes[course]).push(subjects[i].days)
            }
            else{ //no lab classes yet for this course
                lab_classes[course] = [subjects[i].days]
            }   
        }
        else{ //a lec class
            if (course in lec_classes){
                lec_classes[course].push(subjects[i])
            }
            else{
                lec_classes[course] = [subjects[i]]
            }
        }
        var instr = subjects[i].instructor
        if(!(instructors.includes(instr))){ //no instructor yet
            instructor_classes[instr] = subjects.filter(a => a.instructor == instr)
            instructors.push(instr)
            // console.log("WARNINGS: Instructor Classes are: ", instructor_classes.instr)
        }
        // console.log("Instructors dealt with are: ", instructors)
    }
    console.log(lab_classes)

    console.log(instructors)

    for(var key in lab_classes){
        console.log(new Set(lab_classes[key]))
        if(new Set(lab_classes[key]).size != 1){ //not same days
            lab_warnings.push(key)
        }
    }

    console.log(lec_classes)

    for(var key in lec_classes){
        var subj_classes = lec_classes[key] //only classes of the same course
        console.log(subj_classes)
        for(i = 0; i < subj_classes.length; i++){
            for(var j = i+1; j<subj_classes.length; j++) {
                if (timeOnlyConflict(subj_classes[i], subj_classes[j])){ //if lec classes of the same course conflict at time even if different rooms and instructors.
                    var class1 = subj_classes[i].course + " " + subj_classes[i].class_id
                    var class2 = subj_classes[j].course + " " + subj_classes[j].class_id
                    console.log("SAME TIME: ", class1, class2)
                    same_time_warnings.push((class1, class2))
                }
            }
        }
    }
    console.log(same_time_warnings)

    console.log(instructor_classes)

    for(var key in instructor_classes){
        var instr_classes = instructor_classes[key]
        console.log(instr_classes)
        for(i = 0; i < instr_classes.length; i++){
            for(var j = i +1; j < instr_classes.length; j++){
                var common_days, check
                var class1 = instr_classes[i]
                var class2 = instr_classes[j]
                // console.log(class1.course + class1.class_id, class2.course + class2.class_id)
                common_days, check = haveCommonItems(class1.days, class2.days)
                // console.log("test")
                var s_t = convertTimeToNumber(class1.start_time)
                var e_t = convertTimeToNumber(class1.end_time)
                var n_s_t = convertTimeToNumber(class2.start_time)
                var n_e_t = convertTimeToNumber(class2.end_time)
                // console.log(class1.days, class2.days)
                // find if rooms are not in same bldg
                // console.log(class1.course + class1.class_id, class2.course + class2.class_id)
                // console.log((class1.location).split(" ")[0], (class2.location).split(" ")[0])
                if((class1.location).split(" ")[0] != (class2.location).split(" ")[0]){
                    if((s_t == n_e_t || n_s_t == e_t) && check){ //consecutive classes
                        consecutive_warnings.push((class1, class2))
                        // console.log(class1.course + class1.class_id, "consecutive with", class2.course + class2.class_id)
                    }
                }
            }
        }
    }

    





    return [lab_warnings, same_time_warnings, consecutive_warnings]


}