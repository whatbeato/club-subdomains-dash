'use client';

import { useState, useEffect } from 'react';
import Icon from '@hackclub/icons';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Option[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // For club names, use API search; for others, use local filtering
  const isClubNames = label.toLowerCase().includes('club');
  
  const filteredOptions = isClubNames ? searchResults : (
    searchTerm 
      ? options.filter(option =>
          option.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options
  );

  const selectedOption = (isClubNames ? searchResults : options).find(option => option.id === value);
  const displayValue = selectedOption ? selectedOption.name : '';

  // Search API for club names when user types
  useEffect(() => {
    if (!isClubNames || !isOpen) return;
    
    if (searchTerm.length >= 2) {
      setIsSearching(true);
      const timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`/api/club-names?search=${encodeURIComponent(searchTerm)}`);
          const results = await response.json();
          setSearchResults(results);
        } catch (error) {
          console.error('Error searching club names:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, isClubNames, isOpen]);

  console.log(`${label}: isOpen=${isOpen}, options=${options.length}, filtered=${filteredOptions.length}`);

  return (
    <div style={{ marginBottom: '20px' }}>
      <label className="hc-label">{label}</label>
      <div style={{ position: 'relative' }}>
        {/* Main Input */}
        <div
          onClick={() => {
            console.log(`Toggling ${label}: ${isOpen} -> ${!isOpen}`);
            setIsOpen(!isOpen);
          }}
          style={{
            position: 'relative',
            cursor: 'pointer'
          }}
        >
          <input
            type="text"
            className="hc-input"
            value={isOpen ? searchTerm : displayValue}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder={placeholder}
            required={required}
            style={{
              paddingRight: '48px',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#ec3750'
            }}
          >
            <Icon glyph={isOpen ? 'up-caret' : 'down-caret'} size={16} />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              border: '3px solid #ec3750',
              borderRadius: '12px',
              width: '500px',
              maxHeight: '80vh',
              zIndex: 999999,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#ec3750', 
              color: 'white', 
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '10px',
              borderRadius: '8px'
            }}>
              Select {label} ({filteredOptions.length} available)
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {isSearching ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  <Icon glyph="controls" size={16} style={{ marginRight: '8px' }} />
                  Searching...
                </div>
              ) : isClubNames && searchTerm.length < 2 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  <Icon glyph="search" size={16} style={{ marginRight: '8px' }} />
                  Type at least 2 characters to search for clubs
                </div>
              ) : filteredOptions.length === 0 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  <Icon glyph="search" size={16} style={{ marginRight: '8px' }} />
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => {
                      console.log(`Selected ${label}:`, option.name);
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: value === option.id ? '#fef2f2' : 'transparent',
                      border: value === option.id ? '2px solid #ec3750' : '2px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 
                        value === option.id ? '#fef2f2' : 'transparent';
                    }}
                  >
                    {value === option.id && (
                      <Icon glyph="checkmark" size={14} style={{ marginRight: '8px', color: '#ec3750' }} />
                    )}
                    <span style={{ fontSize: '16px' }}>
                      {option.name}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ec3750',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999998
            }}
          />
        )}
      </div>
    </div>
  );
}