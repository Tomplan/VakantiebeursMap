# Todo List

- [ ] Set editable visibility by zoomlevel per marker in unlockMode
  - Implementeer per marker een instelling waarmee de zichtbaarheid (editable/visible) afhankelijk is van het zoomniveau, alleen in unlockMode. Markers kunnen dan pas bewerkt of getoond worden bij een bepaald zoomlevel.
- [ ] Map home more zoomed out
  - Pas de Home-knop aan zodat de map verder uitzoomt (lager zoomniveau) bij het centreren. Controleer of markers zichtbaar blijven en of marker visibility aangepast kan worden per zoomlevel.
- [ ] Map zoom steps smaller
  - Pas de zoomstappen van de Leaflet map aan zodat in- en uitzoomen vloeiender en met kleinere stappen gebeurt. Controleer of dit via de Leaflet opties kan of via een custom zoom handler.
- [ ] Home-knop zoomt map naar default
  - Voeg een Home-knop toe aan de UI waarmee de map direct naar de standaard coördinaten en zoomniveau springt. Default: [51.898819375615844, 5.7732504428013165], zoom 18.
- [ ] Upload preview: sluitknop en Esc
  - Voeg een zichtbare '×' sluitknop toe op de upload preview modal (boven rechts). Zorg dat Esc-toets de preview sluit en dat Esc ook openstaande Leaflet popups sluit. Behandel focus en aria-labels voor toegankelijkheid.
- [ ] Markers te groot op mobiel
  - Onderzoek en corrigeer marker icon-sizes op kleine schermen: implementeer CSS media queries en/of dynamische iconSize-aanpassing bij initialisatie zodat markers proportioneel kleiner zijn onder bv. 480px of 600px breedte.
- [ ] Toon live positie gebruiker op map
  - Implementeer een functie die de huidige locatie van de gebruiker toont op de kaart (Leaflet). Gebruik browser geolocatie API, voeg een marker toe en update deze bij beweging. Optioneel: auto-center en privacy melding.
- [ ] Speciale markers met speciale ids en iconen
  - Implementeer markers met id ≥ 1001 die altijd achteraan in de markersList komen. Gebruik een alternatieve icon-structuur voor deze markers (bijv. custom SVG of PNG). Start met een plan/voorbeeld en marker logica, gebruik de built-in mogelijkheden van Leaflet glyph en Leaflet. Documenteer dit in de todo.

