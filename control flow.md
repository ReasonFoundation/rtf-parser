A group consists of **text** and **control words** or **control symbols** enclosed in braces ({ }).  
```{\field{\*\fldinst{HYPERLINK 

{\field{\*\fldinst{HYPERLINK "https://www.supremecourt.gov/DocketPDF/22/22-179/255584/20230224164242264_Rutherford%20FIRE%20Amicus%20Br.pdf"}}{\fldrslt \f5\i amicus
\f4\i0  brief}} 

 {\field{\*\fldinst{HYPERLINK "https://www.supremecourt.gov/oral_arguments/argument_transcripts/2022/22-179_h3ci.pdf"}}{\fldrslt oral arguments}}
```

```
{ -> control word, symbol, field -> destination or delimiter -> text -> }
```
```
ok so we hit { 
    we start a group, 
    then we hit \, so we add to text, 
    build up "field"
    hit another {
        (add "field" to state?)
    start group?
    hit \, hit *
    emit ignorable
    hit \, build up "fldinst"
    hit { or space, store fldinst as state
        { start group?
        space (basically ignore) start parsing text 
    hit }s

```
```
It's a subtle difference. But the parse functions are not linearly connected to each other. 
The parser runs on a character by character loop. It increases the char index, evaluates the char using the parse function set at this.parserState, that function may then change this.parserState to be a different function. The loop then ends after that function runs. Then it evaluates the next char and so on.
```
The pop() method removes the last element from an array and returns that element. This method changes the length of the array.

 {\field{\*\fldinst{HYPERLINK "https://www.supremecourt.gov/oral_arguments/argument_transcripts/2022/22-179_h3ci.pdf"}}{\fldrslt oral arguments}}
```
For the above rtf fragment, this probable happens:

 parseText('{')
 {
  emitStartGroup()
  emitText (of previous stuff)
  cmd$groupStart()
    push old group onto stack, create new RTFGroup() and make it current this.group
  go to next char (\)
  set parser to parseEscapes
  set to parseControlSymbol
  set to parseControlWord
emitControlWord()
set parse to parseText and call it immediately with char "{"
emitStartGroup()
parseText \
parseEscapes (*) 
parseControlSymbol
emitIgnorable() and set parser to parseText
NOTE: leaving off, we've parsed:  {\field{\*
parseText \
add to this.text until have "fldinst"
parseText hit {
emitStartGroup()

\fldinst{HYPERLINK "https://www.supremecourt.gov/oral_arguments/argument_transcripts/2022/22-179_h3ci.pdf"}}{\fldrslt oral arguments}}
    
    cmd$groupStart
        push old group onto stack, create new RTFGroup() and make it current this.group
``` 

an analogy we could use for field and fieldinst could be fonttbl and f

The delimiter marks the end of an RTF control word, and can be one of the following:

space, digit, hyphen, any character other than a letter or digit.

If the delimiter is a space, it is discarded, that is, it’s not included in subsequent processing.
Any character other than a letter or a digit. In this case, the delimiting character terminates the control word and is not part of the control word. Such as a backslash “\”, which means a new control word or a control symbol follows.

Here's the *syntax* for `\fldinst`

` '{\*' \fldinst <fieldtype><para>+ \fldalt? <datafield>? <formfield>? '}' `

So, take a look at this example pulled straight from the 1.9.1 spec. 

` {\field{\*\fldinst HYPERLINK "http://www.microsoft.com"}{\fldrslt Microsoft}} `  

in this case " "  serves as a *delimiter*, which signifies the end of the control word and is discarded and not included in further processing. But "{" is also not alhpanumeric and would end the control word as well. `HYPERLINK` is weird, because `<fieldtype>` (and also parameters or `<para>` as show in the syntax above) are weird; they don't specify any syntax for parameters or fieldtypes (which seems similar to a parameter) in the RTF spec. So, we have to kinda assume the syntax by process of elimination. We can see in the BNF syntax above that **no** literal space, or any seperator or delimiter, is specified between `\fldinst` and `<fieldtype>` but we do know that delimiters are built into control words (`\fldinst`) themselves: any non-alphanumeric character. Because of that, we have to assume there's at least one non-alphanumeric character between `\fldinst` and `<fieldtype>`. Next, we know that there *can* be (though, probably *should not* be) control words between `\fldinst` and `<fieldtype>` like in this example taken straight from a Google Doc: 

```
{\field{\*\fldinst{\rtlch\ab0\ai0\af2\alang1025\afs22\ltrch\b0\i0\fs22\lang1033\langnp1033\langfe1033\langfenp1033
\loch\af2\dbch\af2\hich\f2\insrsid10976062\strike0\ulnone\cf1 HYPERLINK "www.google.com"}...
```

First, we treat the `{` as normal and start a new group. Then we assume anything starting with a `\` is not `<fieldtype>`, but instead is a control word, as normal.The last control word in the list `cf1` is delimited by a space. Now, the next character after the space is not a `{`,`}`, or `\`, this must be the `<fieldtype>`. We know that `<fieldtype>` must be delimited by a space because all fieldtypes are single words. The part where we use common sense and logic is when parsing the `<para>` that comes after `<fieldtype>`. So, we've established that a `<fieldtype>` is the first alphanumeric string to come after a `\fldinst` and is delimited by a space. But, going by examples and what we know about hyperlinks outside of RTF specifications, the `<param>` for HYPERLINKS is always enclosed with quotation marks, therefore making it not strictly alphanumeric. This would make it, according to the RTF spec itself, "plain text". Plain text would be anything that isn't a group, control word, or control symbol. So, essentially we process everything after the space after `HYPERLINK` until we hit reserved characters like slashes or brackets.

ok with fields there could be a couple ways to do this. 


#### one.

relevant variables

this.fieldDepth
(no property for fieldmod, treat it like a control word, emit, clear, and move on)
this.fieldType
this.fieldParam

```text
<field>	    '{' \field <fieldmod>? <fieldinst> <fieldrslt> '}'
<fieldmod>	\flddirty? & \fldedit? & \fldlock? & \fldpriv?
<fieldinst>	'{\*' \fldinst <fieldtype><para>+ \fldalt? <datafield>? <formfield>? '}'
<fieldrslt>	'{' \fldrslt <para>+ '}'
```

starting with \field control word itself, every time we encounter a `{` we add one to the this.fieldDepth property and subtract one for every closing brace. If we are above zero, then we know we are in a field. So, if depth > 0 and we encounter a slash, then we add to a control word for fieldmod or fieldinst, if it's fieldmod, whatever, if it's fieldinst then we either set a flag property or we use a new parse function or a combo? now that we know we are past fieldinst, we use the logic above to look for fieldtype. we will have a list of fieldtypes (a short one of only HYPERLINK), if HYPERLINK, then look for param. We can use the logic above, if that doesn't work, we can look for quotation marks (only for HYPERLINK). Add it to fieldParam. Don't clear fieldType until we're done with the field. Emit the fieldtype, sending the url along. in the interpreter create a RTFA and pass in the url, clear fieldParam. Back in the parser, ignore \fldalt <datafield> and <formfield>. Once we get to fieldrslt, we can emit any control words needed, especially for text formatting. Then emit text, this probably all should go to the link, specifically because we know we're in a HYPERLINK. 

the other way is we basically have a property in parser for EVERYTHING related to fields. if the property is undefined (or maybe null) it means we're not "past" it in the syntax. If the property is an empty string (different than null and undefined), then it means we're past it: we evaluated for it and found nothing. At the end, we would reset all appropriate ones to undefined. so, for instance, we would have a logic check like `if(!isUndefined(this.fieldMod) && !isUndefined(this.fieldInstruction && !isUndefined(this.fieldType))) //then we must be evaluating fieldRslt`

update field depth, deal with fieldmod if exists, parseControlword

`ok so maybe there's a subtle difference in how param relates to fldinst and fieldtype. maybe you have to think of fieldinst as a generic and fieldtype is its *type*. In a sense, fieldinst is a fill in the blank control word and fieldtype is the "fill in" part. Next up, param is not the parameter of fieldtype technically, it's the param of fieldinst. Put backwards, param is the parameter of fieldinst and not fieldtype (even though it's next to fieldtype) and fieldtype essentially defines the fldinst control word. Therefore, param can be a "control word parameter".`

### Start and End Groups

STA nothing
STA {\rtf1
STA {\rtf1{\field
STA {\rtf1{\field{\*\fldinst
END {\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"
END {\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"}
STA {\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"}}
END {\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"}}{\fldrslt oral arguments
END {\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"}}{\fldrslt oral arguments}
END {\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"}}{\fldrslt oral arguments}}

{\rtf1{\field{\*\fldinst{HYPERLINK "www.hi.me/"}}{\fldrslt oral arguments}}}


