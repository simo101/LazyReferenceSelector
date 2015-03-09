# Lazy Reference Selector

This widget does the same as the built-in Reference Selector, except that it does not fetch data until the dropdown is clicked. Optionally the data can be refetched each time the dropdown is clicked.

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Typical usage scenario

Optimizes performance of a page by loading the items of a dropdown input on click, instead of on load of the page.

## Features and limitations

* Selectable objects can be fetched using a Microflow or XPath constraint

##Properties

* Refresh on drop down - Refresh the objects on drop down
* Source entity - Source entity
* Reference entity path - Path to the referenced entity
* Display Attribute - Attribute to display in the selection dropdown
* XPath constraint - XPath constraint to select only specific objects
* Microflow - Microflow to fetch selectable objects
* On change microflow - Microflow to trigger on change
