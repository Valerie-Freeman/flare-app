## Lifestyle Choices (official name tbd)
These scenarios do not map out the exact workflow or data structure for the collected data. This document is a high level walkthrough of the vision of these features. Even the names of the data points are not decided yet, such as "lifestyle choice". Not every possible scenario or scenario type is defined below. 
### User tracks lifestyle choices
**scenario:** The user thinks magnesium glycinate will help with their health condition. They want to start taking it right away. The user can add magnesium to their current lifestyle choices (I'm still not sure about this name, lifestyle choice). They can optionally add dosage, purpose, or any other notes about this. The user notes that this is supposed to help with muscle pain and improve sleep. The user can optionally add a frequency of when they want to do this (take magnesium) and can choose wether or not they want to be reminded (push notification) to do this. They set the frequency to daily and since they want to take it before bed they set a reminder for this for 9:00pm daily.

**scenario:** The user was recommended by a healthcare provider to drink an adrenal cocktail twice a day to help with fatigue and brain fog. The user notes some recipes for the adrenal cocktail. The user marks the frequency for this as 2 times a day. The user does not wish to receive push notification reminders for this. 

**scenario:** The user wants to follow a morning pilates routine. The user notes how they believe this will benefit them and what they expect the outcome to be (purpose). The user links the pilates routine youtube video. 

**scenario:** The user thinks that walking daily will improve their joint stiffness, muscle pain, and overall energy. The user can choose to track their steps by logging their steps at the end of each day. The user wishes to be notified at 11:00pm every day to log their steps. 

**scenario:** The user no longer wishes to log their steps as they keep forgetting to do so. The user can remove this as a tracker (lifestyle choice) and will no longer see it in their list or receive notifications for it.

**post MVP scenario:** A friend told the user to start taking beef liver supplements. The user wants to try this but doesn't have any beef liver yet. The user is able to follow the same wizard/walkthrough as other lifestyle choices but can choose to not mark it as active. Later the user can view all their listed inactive lifestyle choices and mark as as active to start tracking them and be notified for them if they wish. 

**post MVP scenario:** The user wishes to follow the AIP protocol and track this in the application

**post MVP scenario:** The user wished to eliminate all FODMAPS from their diet and track this in the application.  
#### Considerations:
- Adding tags to lifestyle choice?
- Same form for any type of lifestyle choice, or are there a few categories based on logging type?
- Any pre-defined lifestyle choices the user can select or are they all user created? Maybe just some static or AI generated suggestions for post MVP...
- Inactive lifestyle choices (lifestyle choices that the user logs but is not ready to start yet) should be a stretch goal but it should be documented for future implementation. 
- Nutrition is complicated and I think I need to get most of the base functionality up and running before designing and implementing the food journal and elimination diet functionality. So this needs to be marked as post MVP.

### User views active lifestyle choices
 **scenario:** The user wishes to see what choices they need to complete today. The open the app and see their task list in the dashboard. (format not decided) It includes:
 
 [ ] take magnesium (9:00pm)
 [1/2]  drink adrenal cocktail 
 [x] pilates routine

### User is reminded of a lifestyle choice
**scenario:** It's 9:00pm. The user receives a push notification reminding them it's time to take magnesium glycinate.

### User completes a lifestyle choice
**scenario:** The user drank an adrenal cocktail and wishes to mark it as completed in the application. When the user visits the dashboard they can see they've already drank 1 of the 2 adrenal cocktails they wanted to drink today. They mark it as 2/2 and the task is complete.

**scenario:** After the user was reminded to take the magnesium the took the noted dosage and marked it complete in the dashboard. All items on their task list for the day have been completed.  

**scenario:** The user forgot to mark that they completed their pilates routine yesterday and they day before. They can make this adjustment.
### User sees how lifestyle choices impact their health
**scenario:** The user views a graph comparing their quality of sleep for the past three months and when they've taken magnesium (started 2 months ago). They can see that their sleep quality improved after 2 weeks of taking magnesium consistently but dropped slightly when they got off track (didn't mark it as complete).

**scenario:** AI is able to analyze their data and summarize a report of the last 6 months comparing how their symptoms have changed or improved to what lifestyles choices they've logged (completed and metrics)